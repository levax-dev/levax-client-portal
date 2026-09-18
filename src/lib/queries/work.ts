import "server-only"

import { timestampRange } from "@/lib/periods"
import type { createClient } from "@/lib/supabase/server"
import type { IssuePriority, IssueType, TicketCategory } from "@/types/database"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export interface Person {
  id: string
  full_name: string | null
  avatar_url: string | null
}

/** One row in every planning table, whatever page it's on. */
export interface WorkItem {
  id: string
  title: string
  type: IssueType
  category: TicketCategory | null
  priority: IssuePriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  orgId: string
  orgName: string | null
  projectId: string
  projectName: string | null
  departmentId: string | null
  department: string | null
  status: { name: string; color: string; isDone: boolean } | null
  assignee: Person | null
  reporter: Person | null
  parentTicketId: string | null
}

/**
 * `issues` has two foreign keys into `projects` (the board it lives on and the
 * optional linked project), so the embed has to name the constraint or
 * PostgREST can't tell which one is meant.
 */
const WORK_SELECT = `
  id, title, type, category, priority, start_date, due_date, estimated_hours,
  resolved_at, resolution_note, created_at, org_id, project_id, parent_ticket_id, department_id,
  organizations(name),
  projects!issues_project_id_fkey(id, name),
  departments(name),
  board_columns(name, color, is_done_column),
  assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url),
  reporter:profiles!issues_reporter_id_fkey(id, full_name, avatar_url)
`

type RawWorkRow = {
  id: string
  title: string
  type: IssueType
  category: TicketCategory | null
  priority: IssuePriority
  start_date: string | null
  due_date: string | null
  estimated_hours: number | null
  resolved_at: string | null
  resolution_note: string | null
  created_at: string
  org_id: string
  project_id: string
  parent_ticket_id: string | null
  department_id: string | null
  organizations: unknown
  projects: unknown
  departments: unknown
  board_columns: unknown
  assignee: unknown
  reporter: unknown
}

function mapWorkItem(row: RawWorkRow): WorkItem {
  const column = row.board_columns as { name: string; color: string; is_done_column: boolean } | null
  const project = row.projects as { id: string; name: string } | null
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    estimatedHours: row.estimated_hours,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    orgId: row.org_id,
    orgName: (row.organizations as { name: string } | null)?.name ?? null,
    projectId: row.project_id,
    projectName: project?.name ?? null,
    departmentId: row.department_id,
    department: (row.departments as { name: string } | null)?.name ?? null,
    status: column ? { name: column.name, color: column.color, isDone: column.is_done_column } : null,
    assignee: (row.assignee as Person | null) ?? null,
    reporter: (row.reporter as Person | null) ?? null,
    parentTicketId: row.parent_ticket_id,
  }
}

/**
 * Which slice of the workspace a planning page is looking at.
 *
 * `orgId` narrows to one client. `assigneeId` is "my work". `projectIds` is a
 * project lead's boards — and therefore their team, since a lead's team is
 * whoever is working on the projects they lead.
 */
export interface WorkScope {
  orgId?: string | null
  assigneeId?: string
  projectIds?: string[]
  /** Only work items (tasks), not the tickets they came from. */
  tasksOnly?: boolean
}

function scoped<T extends { eq: (c: string, v: string) => T; in: (c: string, v: string[]) => T }>(
  query: T,
  scope: WorkScope
): T {
  let q = query
  if (scope.orgId) q = q.eq("org_id", scope.orgId)
  if (scope.assigneeId) q = q.eq("assignee_id", scope.assigneeId)
  if (scope.projectIds) q = q.in("project_id", scope.projectIds)
  if (scope.tasksOnly) q = q.eq("type", "task")
  return q
}

/** An empty `projectIds` means "no boards at all" — don't query for nothing. */
function isEmptyScope(scope: WorkScope): boolean {
  return scope.projectIds !== undefined && scope.projectIds.length === 0
}

/**
 * Work due inside a date window and not yet finished — the answer to "what can
 * I expect to be closed today / this week".
 */
export async function getScheduled(
  supabase: ServerClient,
  scope: WorkScope,
  from: string,
  to: string
): Promise<WorkItem[]> {
  if (isEmptyScope(scope)) return []
  const { data } = await scoped(
    supabase
      .from("issues")
      .select(WORK_SELECT)
      .is("resolved_at", null)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true }),
    scope
  )
  return ((data ?? []) as unknown as RawWorkRow[]).map(mapWorkItem).filter((i) => !i.status?.isDone)
}

/** Past its delivery date and still open. */
export async function getOverdue(
  supabase: ServerClient,
  scope: WorkScope,
  today: string
): Promise<WorkItem[]> {
  if (isEmptyScope(scope)) return []
  const { data } = await scoped(
    supabase
      .from("issues")
      .select(WORK_SELECT)
      .is("resolved_at", null)
      .lt("due_date", today)
      .order("due_date", { ascending: true }),
    scope
  )
  return ((data ?? []) as unknown as RawWorkRow[]).map(mapWorkItem).filter((i) => !i.status?.isDone)
}

/**
 * Open work with no delivery date on it. This is the team's real backlog risk:
 * nobody has committed to when it lands, so it silently never does.
 */
export async function getUnscheduled(
  supabase: ServerClient,
  scope: WorkScope
): Promise<WorkItem[]> {
  if (isEmptyScope(scope)) return []
  const { data } = await scoped(
    supabase
      .from("issues")
      .select(WORK_SELECT)
      .is("resolved_at", null)
      .is("due_date", null)
      .order("created_at", { ascending: true }),
    scope
  )
  return ((data ?? []) as unknown as RawWorkRow[]).map(mapWorkItem).filter((i) => !i.status?.isDone)
}

/**
 * Work finished inside a period.
 *
 * `resolved_at` is a timestamp while the period is calendar days, so the window
 * is resolved to real UTC instants for the business timezone — otherwise work
 * closed first thing in the morning files under the previous day.
 */
export async function getCompleted(
  supabase: ServerClient,
  scope: WorkScope,
  from: string,
  to: string
): Promise<WorkItem[]> {
  if (isEmptyScope(scope)) return []
  const { startUTC, endUTC } = timestampRange(from, to)
  const { data } = await scoped(
    supabase
      .from("issues")
      .select(WORK_SELECT)
      .not("resolved_at", "is", null)
      .gte("resolved_at", startUTC)
      .lt("resolved_at", endUTC)
      .order("resolved_at", { ascending: false }),
    scope
  )
  return ((data ?? []) as unknown as RawWorkRow[]).map(mapWorkItem)
}

/** All open work in scope — used for per-person load and completion rates. */
export async function getOpenWork(supabase: ServerClient, scope: WorkScope): Promise<WorkItem[]> {
  if (isEmptyScope(scope)) return []
  const { data } = await scoped(
    supabase.from("issues").select(WORK_SELECT).is("resolved_at", null).order("due_date"),
    scope
  )
  return ((data ?? []) as unknown as RawWorkRow[]).map(mapWorkItem).filter((i) => !i.status?.isDone)
}

export interface PendingProject {
  id: string
  name: string
  description: string | null
  startDate: string | null
  targetDate: string | null
  createdAt: string
  decisionNote: string | null
  approvalStatus: "pending" | "approved" | "rejected"
  orgId: string
  orgName: string | null
  lead: Person | null
  departments: string[]
}

/** Projects the client still has to decide on, oldest request first. */
export async function getProjectsAwaitingDecision(
  supabase: ServerClient,
  orgId: string | null,
  statuses: ("pending" | "rejected")[] = ["pending"]
): Promise<PendingProject[]> {
  let query = supabase
    .from("projects")
    .select(
      `id, name, description, start_date, target_date, created_at, decision_note,
       approval_status, org_id,
       organizations(name),
       lead:profiles!projects_lead_id_fkey(id, full_name, avatar_url),
       project_departments(departments(name))`
    )
    .in("approval_status", statuses)
    .order("created_at", { ascending: true })

  if (orgId) query = query.eq("org_id", orgId)

  const { data } = await query

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    targetDate: row.target_date,
    createdAt: row.created_at,
    decisionNote: row.decision_note,
    approvalStatus: row.approval_status as PendingProject["approvalStatus"],
    orgId: row.org_id,
    orgName: (row.organizations as unknown as { name: string } | null)?.name ?? null,
    lead: (row.lead as unknown as Person | null) ?? null,
    departments: (
      (row.project_departments as unknown as { departments: { name: string } | null }[]) ?? []
    )
      .map((pd) => pd.departments?.name)
      .filter((n): n is string => !!n),
  }))
}

export interface MemberLoad {
  person: Person
  weeklyCapacityHours: number
  open: number
  dueToday: number
  overdue: number
  unscheduled: number
  dueThisPeriod: number
  hoursThisPeriod: number
  completedThisPeriod: number
  /** Completed ÷ (completed + still open), as a percentage. */
  completionRate: number
}

/**
 * Per-person delivery picture for a lead's boards. Everything is derived from
 * two already-fetched lists rather than a query per person, so adding a team
 * member doesn't add a round trip.
 */
export function buildMemberLoads({
  people,
  open,
  completed,
  today,
  periodFrom,
  periodTo,
}: {
  people: (Person & { weekly_capacity_hours?: number | null })[]
  open: WorkItem[]
  completed: WorkItem[]
  today: string
  periodFrom: string
  periodTo: string
}): MemberLoad[] {
  return people
    .map((person) => {
      const mine = open.filter((i) => i.assignee?.id === person.id)
      const mineDone = completed.filter((i) => i.assignee?.id === person.id)
      const inPeriod = mine.filter(
        (i) => i.dueDate && i.dueDate >= periodFrom && i.dueDate <= periodTo
      )
      const totalTouched = mine.length + mineDone.length

      return {
        person: { id: person.id, full_name: person.full_name, avatar_url: person.avatar_url },
        weeklyCapacityHours: Number(person.weekly_capacity_hours ?? 40),
        open: mine.length,
        dueToday: mine.filter((i) => i.dueDate === today).length,
        overdue: mine.filter((i) => i.dueDate && i.dueDate < today).length,
        unscheduled: mine.filter((i) => !i.dueDate).length,
        dueThisPeriod: inPeriod.length,
        hoursThisPeriod: inPeriod.reduce((sum, i) => sum + Number(i.estimatedHours ?? 0), 0),
        completedThisPeriod: mineDone.length,
        completionRate: totalTouched === 0 ? 0 : Math.round((mineDone.length / totalTouched) * 100),
      }
    })
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)
}

/** Everyone assigned work on a set of boards, plus their stated capacity. */
export async function getTeamMembers(
  supabase: ServerClient,
  projectIds: string[]
): Promise<(Person & { weekly_capacity_hours: number })[]> {
  if (projectIds.length === 0) return []

  const { data: assigned } = await supabase
    .from("issues")
    .select("assignee_id")
    .in("project_id", projectIds)
    .not("assignee_id", "is", null)

  const ids = Array.from(new Set((assigned ?? []).map((r) => r.assignee_id))).filter(
    (id): id is string => !!id
  )
  if (ids.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, weekly_capacity_hours")
    .in("id", ids)
    .order("full_name")

  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    weekly_capacity_hours: Number(p.weekly_capacity_hours ?? 40),
  }))
}
