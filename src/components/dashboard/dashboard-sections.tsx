import Link from "next/link"
import { ArrowRight, KanbanSquare, Ticket as TicketIcon } from "lucide-react"

import { OrgBreakdown, type OrgBreakdownRow } from "@/components/dashboard/org-breakdown"
import { StaffContributions, type StaffContributionRow } from "@/components/dashboard/staff-contributions"
import { PriorityBadge } from "@/components/priority-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof TicketIcon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

// ── Staff (cross-org) sections ──────────────────────────────────────────

export async function StaffTotalTasksStat() {
  const supabase = await createClient()
  const { count } = await supabase.from("issues").select("id", { count: "exact", head: true })
  return <StatCard label="Total tasks (all orgs)" value={count ?? 0} icon={KanbanSquare} />
}

export async function StaffOpenTicketsStat() {
  const supabase = await createClient()
  const { count } = await supabase
    .from("issues")
    .select("id, board_columns!inner(is_done_column)", { count: "exact", head: true })
    .eq("type", "ticket")
    .eq("board_columns.is_done_column", false)
  return <StatCard label="Open tickets (all orgs)" value={count ?? 0} icon={TicketIcon} />
}

export async function StaffMyIssuesStat({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { count } = await supabase.from("issues").select("id", { count: "exact", head: true }).eq("assignee_id", userId)
  return <StatCard label="Assigned to me" value={count ?? 0} icon={KanbanSquare} />
}

export async function StaffActiveProjectsStat() {
  const supabase = await createClient()
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("is_support_project", false)
    .eq("status", "active")
  return <StatCard label="Active projects (all orgs)" value={count ?? 0} icon={KanbanSquare} />
}

export async function StaffOrgBreakdownSection() {
  const supabase = await createClient()
  const { data: ticketRows } = await supabase
    .from("issues")
    .select("org_id, organizations(name), board_columns(is_done_column)")
    .eq("type", "ticket")

  const breakdownMap = new Map<string, OrgBreakdownRow>()
  for (const row of ticketRows ?? []) {
    const org = row.organizations as unknown as { name: string } | null
    const column = row.board_columns as unknown as { is_done_column: boolean } | null
    if (!org) continue
    const existing = breakdownMap.get(row.org_id) ?? {
      orgId: row.org_id,
      orgName: org.name,
      openTickets: 0,
      resolvedTickets: 0,
      totalTickets: 0,
    }
    existing.totalTickets++
    if (column?.is_done_column) existing.resolvedTickets++
    else existing.openTickets++
    breakdownMap.set(row.org_id, existing)
  }
  const rows = Array.from(breakdownMap.values()).sort((a, b) => a.orgName.localeCompare(b.orgName))

  return <OrgBreakdown rows={rows} />
}

export async function StaffContributionsSection() {
  const supabase = await createClient()
  const { data: staffProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("platform_role", ["staff", "super_admin"])

  let rows: StaffContributionRow[] = []
  if (staffProfiles && staffProfiles.length > 0) {
    const staffIds = staffProfiles.map((p) => p.id)
    const { data: staffIssues } = await supabase
      .from("issues")
      .select("assignee_id, resolved_at")
      .in("assignee_id", staffIds)

    rows = staffProfiles.map((p) => {
      const assigned = staffIssues?.filter((i) => i.assignee_id === p.id) ?? []
      return {
        id: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        assigned: assigned.length,
        resolved: assigned.filter((i) => i.resolved_at).length,
      }
    })
  }

  return <StaffContributions rows={rows} />
}

export async function StaffRecentActivitySection() {
  const supabase = await createClient()
  const { data: recentIssues } = await supabase
    .from("issues")
    .select("id, title, priority, type, created_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(8)

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent activity across all orgs</CardTitle>
        <Button variant="ghost" size="sm" render={<Link href="/tickets" />}>
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {recentIssues && recentIssues.length > 0 ? (
          recentIssues.map((issue) => {
            const org = issue.organizations as unknown as { name: string } | null
            return (
              <Link
                key={issue.id}
                href={`/tickets/${issue.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{issue.title}</p>
                  {org && <p className="truncate text-xs text-muted-foreground">{org.name}</p>}
                </div>
                <PriorityBadge priority={issue.priority} />
              </Link>
            )
          })
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Client (single-org) sections ────────────────────────────────────────

export async function ClientTotalTicketsStat({ orgId, deptId }: { orgId: string; deptId?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from("issues")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("type", "ticket")
  if (deptId) query = query.eq("department_id", deptId)
  const { count } = await query
  return <StatCard label="Total tickets" value={count ?? 0} icon={TicketIcon} />
}

export async function ClientActiveProjectsStat({ orgId, deptId }: { orgId: string; deptId?: string }) {
  const supabase = await createClient()
  if (deptId) {
    const { count } = await supabase
      .from("project_departments")
      .select("project_id, projects!inner(id, org_id, status)", { count: "exact", head: true })
      .eq("department_id", deptId)
      .eq("projects.org_id", orgId)
      .eq("projects.status", "active")
    return <StatCard label="Active projects" value={count ?? 0} icon={KanbanSquare} />
  }
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_support_project", false)
    .eq("status", "active")
  return <StatCard label="Active projects" value={count ?? 0} icon={KanbanSquare} />
}

export async function ClientRecentActivitySection({ orgId, deptId }: { orgId: string; deptId?: string }) {
  const supabase = await createClient()
  let query = supabase
    .from("issues")
    .select("id, title, priority, type, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(6)
  if (deptId) query = query.eq("department_id", deptId)
  const { data: recentIssues } = await query

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent activity</CardTitle>
        <Button variant="ghost" size="sm" render={<Link href="/tickets" />}>
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {recentIssues && recentIssues.length > 0 ? (
          recentIssues.map((issue) => (
            <Link
              key={issue.id}
              href={`/tickets/${issue.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-accent"
            >
              <span className="truncate text-sm font-medium">{issue.title}</span>
              <PriorityBadge priority={issue.priority} />
            </Link>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
