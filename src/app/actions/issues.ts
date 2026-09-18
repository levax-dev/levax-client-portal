"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { storeAttachments } from "@/lib/attachments"
import { requireUser } from "@/lib/auth"
import { notify } from "@/lib/notify"
import { createClient } from "@/lib/supabase/server"
import type { Issue, IssuePriority } from "@/types/database"
import {
  commentSchema,
  completeIssueSchema,
  convertTicketSchema,
  createIssueSchema,
  createTicketSchema,
  moveIssueSchema,
  scheduleIssueSchema,
  updateIssueSchema,
} from "@/lib/validations/issue"

export type ActionState = { error?: string; success?: string } | null

type ServerClient = Awaited<ReturnType<typeof createClient>>

/** Pages whose numbers move whenever any issue changes. */
const WORKSPACE_PATHS = ["/dashboard", "/schedule", "/work-log", "/team-tracking", "/tickets"]

function revalidateWorkspace() {
  for (const path of WORKSPACE_PATHS) revalidatePath(path)
}

/**
 * Server Functions are reachable by direct POST, not just through the UI, so
 * every mutation re-checks the caller rather than trusting that the button was
 * hidden. Triage — assigning, scheduling, moving, closing — is staff work.
 */
async function requireStaff() {
  const user = await requireUser()
  return user.isStaff ? user : null
}

// ── Raising work ────────────────────────────────────────────────────────

/**
 * Raises a ticket into a project the reporter has access to, with any files
 * attached in the same step. Priority isn't set by the reporter — it defaults
 * to medium and is triaged by the project lead once the ticket lands.
 */
export async function createTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTicketSchema.safeParse({
    projectId: formData.get("projectId"),
    departmentId: formData.get("departmentId") || undefined,
    category: formData.get("category"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, name, lead_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle()
  if (!project) return { error: "That project could not be found." }

  const { data: column } = await supabase
    .from("board_columns")
    .select("id")
    .eq("project_id", project.id)
    .order("position")
    .limit(1)
    .maybeSingle()
  if (!column) return { error: "This project's board is not set up correctly." }

  const { data: issue, error } = await supabase
    .from("issues")
    .insert({
      org_id: project.org_id,
      project_id: project.id,
      column_id: column.id,
      department_id: parsed.data.departmentId || null,
      type: "ticket",
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: "medium",
      reporter_id: user.id,
    })
    .select("id")
    .single()
  if (error || !issue) return { error: error?.message ?? "Could not create ticket." }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File)
  const stored = await storeAttachments({
    supabase,
    orgId: project.org_id,
    issueId: issue.id,
    userId: user.id,
    files,
  })

  await notifyTicketRaised(supabase, project, issue.id, parsed.data.title, user.id)
  revalidateWorkspace()

  if (stored.error) {
    // The ticket exists and files can still be attached from its page —
    // surfacing the ticket beats throwing away what they typed.
    return { error: `Ticket raised, but a file was rejected: ${stored.error}` }
  }

  redirect(`/tickets/${issue.id}`)
}

async function notifyTicketRaised(
  supabase: ServerClient,
  project: { org_id: string; name: string; lead_id: string | null },
  issueId: string,
  title: string,
  reporterId: string
) {
  if (!project.lead_id) return
  await notify(supabase, {
    userIds: [project.lead_id],
    orgId: project.org_id,
    type: "ticket_raised",
    title: "New ticket needs triage",
    body: `${title} — ${project.name}`,
    link: `/tickets/${issueId}`,
    exceptUserId: reporterId,
  })
}

/**
 * Creates a work item directly on a board. Staff only, and it still needs a
 * root ticket: the rule is that no task exists without a request behind it.
 */
export async function createIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff()
  if (!user) return { error: "Only Leverage Axiom staff can create tasks." }

  const parsed = createIssueSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle()
  if (!project) return { error: "Project not found." }

  const { data: ticket } = await supabase
    .from("issues")
    .select("id, department_id, category")
    .eq("id", parsed.data.parentTicketId)
    .eq("type", "ticket")
    .maybeSingle()
  if (!ticket) return { error: "Choose the ticket this task comes from." }

  const { error } = await supabase.from("issues").insert({
    org_id: project.org_id,
    project_id: parsed.data.projectId,
    column_id: parsed.data.columnId,
    parent_ticket_id: ticket.id,
    department_id: ticket.department_id,
    category: ticket.category,
    type: parsed.data.type === "ticket" ? "task" : parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    reporter_id: user.id,
    assignee_id: parsed.data.assigneeId || null,
    start_date: parsed.data.startDate || null,
    due_date: parsed.data.dueDate || null,
    estimated_hours: parsed.data.estimatedHours ?? null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/projects/${parsed.data.projectId}`)
  revalidateWorkspace()
  return { success: "Task created." }
}

/**
 * Triage: turn a client's ticket into a scheduled task on a delivery board.
 *
 * The ticket deliberately stays where it is. The client keeps watching and
 * commenting on the thing they raised, while the team gets a work item with
 * its own assignee, dates and estimate — and a ticket can spawn as many tasks
 * as the work actually needs.
 */
export async function convertTicketToTask(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireStaff()
  if (!user) return { error: "Only Leverage Axiom staff can convert tickets." }

  const parsed = convertTicketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()

  const { data: ticket } = await supabase
    .from("issues")
    .select("id, org_id, department_id, reporter_id, category")
    .eq("id", parsed.data.ticketId)
    .eq("type", "ticket")
    .maybeSingle()
  if (!ticket) return { error: "Ticket not found." }

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, name")
    .eq("id", parsed.data.projectId)
    .maybeSingle()
  if (!project) return { error: "Project not found." }
  if (project.org_id !== ticket.org_id) {
    return { error: "That project belongs to a different organization." }
  }

  const { data: column } = await supabase
    .from("board_columns")
    .select("id")
    .eq("project_id", project.id)
    .order("position")
    .limit(1)
    .maybeSingle()
  if (!column) return { error: "That project's board is not set up correctly." }

  const { data: task, error } = await supabase
    .from("issues")
    .insert({
      org_id: ticket.org_id,
      project_id: project.id,
      column_id: column.id,
      parent_ticket_id: ticket.id,
      department_id: ticket.department_id,
      category: ticket.category,
      type: "task",
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      reporter_id: user.id,
      assignee_id: parsed.data.assigneeId || null,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null,
      estimated_hours: parsed.data.estimatedHours ?? null,
    })
    .select("id")
    .single()
  if (error || !task) return { error: error?.message ?? "Could not create the task." }

  await notify(supabase, {
    userIds: [ticket.reporter_id, parsed.data.assigneeId].filter((id): id is string => !!id),
    orgId: ticket.org_id,
    type: "ticket_scheduled",
    title: "Your ticket is now scheduled",
    body: parsed.data.dueDate
      ? `"${parsed.data.title}" is planned for delivery on ${parsed.data.dueDate}.`
      : `"${parsed.data.title}" has been added to ${project.name}.`,
    link: `/tickets/${ticket.id}`,
    exceptUserId: user.id,
  })

  revalidatePath(`/tickets/${ticket.id}`)
  revalidatePath(`/projects/${project.id}`)
  revalidateWorkspace()
  return { success: "Task created from this ticket." }
}

// ── Editing ─────────────────────────────────────────────────────────────

export async function updateIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff()
  if (!user) return { error: "You don't have permission to edit this." }

  const parsed = updateIssueSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { id, ...rest } = parsed.data

  const update: Partial<Issue> = {}
  if (rest.title !== undefined) update.title = rest.title
  if (rest.description !== undefined) update.description = rest.description
  if (rest.priority !== undefined) update.priority = rest.priority
  if (rest.assigneeId !== undefined) update.assignee_id = rest.assigneeId || null
  if (rest.startDate !== undefined) update.start_date = rest.startDate || null
  if (rest.dueDate !== undefined) update.due_date = rest.dueDate || null
  if (rest.estimatedHours !== undefined) update.estimated_hours = rest.estimatedHours ?? null

  const { error } = await supabase.from("issues").update(update).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
  return { success: "Saved." }
}

/**
 * Sets the timeline on a work item in one go — the action behind the inline
 * "schedule this" row on the planning pages, where the whole point is clearing
 * a backlog of undated tasks without opening each one.
 */
export async function scheduleIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff()
  if (!user) return { error: "You don't have permission to schedule work." }

  const parsed = scheduleIssueSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const { startDate, dueDate } = parsed.data
  if (startDate && dueDate && startDate > dueDate) {
    return { error: "The start date falls after the delivery date." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("issues")
    .update({
      start_date: startDate || null,
      due_date: dueDate || null,
      estimated_hours: parsed.data.estimatedHours ?? null,
      ...(parsed.data.assigneeId !== undefined
        ? { assignee_id: parsed.data.assigneeId || null }
        : {}),
    })
    .eq("id", parsed.data.id)
  if (error) return { error: error.message }

  revalidatePath(`/tickets/${parsed.data.id}`)
  revalidateWorkspace()
  return { success: "Timeline updated." }
}

/**
 * Closes a work item with a note describing what was actually done. That note
 * is the substance of the work log both the client and the team read back, so
 * it is required rather than optional.
 */
export async function completeIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireStaff()
  if (!user) return { error: "You don't have permission to close this." }

  const parsed = completeIssueSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()

  const { data: issue } = await supabase
    .from("issues")
    .select("id, project_id, org_id, title, parent_ticket_id, reporter_id")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (!issue) return { error: "That item no longer exists." }

  const { data: doneColumn } = await supabase
    .from("board_columns")
    .select("id")
    .eq("project_id", issue.project_id)
    .eq("is_done_column", true)
    .order("position")
    .limit(1)
    .maybeSingle()

  const { error } = await supabase
    .from("issues")
    .update({
      resolution_note: parsed.data.resolutionNote,
      resolved_at: new Date().toISOString(),
      ...(doneColumn ? { column_id: doneColumn.id } : {}),
    })
    .eq("id", issue.id)
  if (error) return { error: error.message }

  // Tell whoever asked for this that it landed.
  const rootTicketId = issue.parent_ticket_id ?? issue.id
  const { data: rootTicket } = await supabase
    .from("issues")
    .select("reporter_id")
    .eq("id", rootTicketId)
    .maybeSingle()

  await notify(supabase, {
    userIds: [rootTicket?.reporter_id, issue.reporter_id].filter((id): id is string => !!id),
    orgId: issue.org_id,
    type: "work_completed",
    title: "Work completed",
    body: `${issue.title} — ${parsed.data.resolutionNote.slice(0, 160)}`,
    link: `/tickets/${rootTicketId}`,
    exceptUserId: user.id,
  })

  revalidatePath(`/tickets/${issue.id}`)
  revalidatePath(`/tickets/${rootTicketId}`)
  revalidatePath(`/projects/${issue.project_id}`)
  revalidateWorkspace()
  return { success: "Closed." }
}

/** Moves an issue to a new column/position — used by the Kanban drag-and-drop. */
export async function moveIssue(input: { id: string; columnId: string; position: number }) {
  const user = await requireStaff()
  if (!user) return { error: "The board is read-only for your account." }

  const parsed = moveIssueSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid move." }

  const supabase = await createClient()

  const { data: column } = await supabase
    .from("board_columns")
    .select("is_done_column, project_id")
    .eq("id", parsed.data.columnId)
    .maybeSingle()

  const { error } = await supabase
    .from("issues")
    .update({
      column_id: parsed.data.columnId,
      position: parsed.data.position,
      resolved_at: column?.is_done_column ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id)
  if (error) return { error: error.message }

  if (column?.project_id) revalidatePath(`/projects/${column.project_id}`)
  revalidateWorkspace()
  return { success: true }
}

// ── Single-field setters, used by the ticket sidebar ─────────────────────

export async function setIssuePriority(id: string, priority: IssuePriority) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ priority }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
}

export async function setIssueAssignee(id: string, assigneeId: string | null) {
  const user = await requireStaff()
  if (!user) return
  const supabase = await createClient()
  await supabase.from("issues").update({ assignee_id: assigneeId }).eq("id", id)

  if (assigneeId) {
    const { data: issue } = await supabase
      .from("issues")
      .select("title, org_id, due_date")
      .eq("id", id)
      .maybeSingle()
    if (issue) {
      await notify(supabase, {
        userIds: [assigneeId],
        orgId: issue.org_id,
        type: "assigned",
        title: "Assigned to you",
        body: issue.due_date ? `${issue.title} — due ${issue.due_date}` : issue.title,
        link: `/tickets/${id}`,
        exceptUserId: user.id,
      })
    }
  }

  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
}

export async function setIssueColumn(id: string, columnId: string) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  const { data: column } = await supabase
    .from("board_columns")
    .select("is_done_column, project_id")
    .eq("id", columnId)
    .maybeSingle()

  await supabase
    .from("issues")
    .update({
      column_id: columnId,
      resolved_at: column?.is_done_column ? new Date().toISOString() : null,
    })
    .eq("id", id)

  revalidatePath(`/tickets/${id}`)
  if (column?.project_id) revalidatePath(`/projects/${column.project_id}`)
  revalidateWorkspace()
}

export async function setIssueDueDate(id: string, dueDate: string | null) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ due_date: dueDate }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
}

export async function setIssueStartDate(id: string, startDate: string | null) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ start_date: startDate }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
}

export async function setIssueEstimate(id: string, hours: number | null) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ estimated_hours: hours }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
  revalidateWorkspace()
}

/** Staff-only: associate a ticket with a broader project for context. */
export async function setIssueLinkedProject(id: string, projectId: string | null) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ linked_project_id: projectId }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

export async function setIssueDepartment(id: string, departmentId: string | null) {
  if (!(await requireStaff())) return
  const supabase = await createClient()
  await supabase.from("issues").update({ department_id: departmentId }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

// ── Comments ────────────────────────────────────────────────────────────

/** Open to clients too — commenting is how they follow up on a ticket. */
export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = commentSchema.safeParse({
    ...Object.fromEntries(formData),
    isInternal: formData.get("isInternal") === "on" || formData.get("isInternal") === "true",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()
  const isInternal = user.isStaff ? parsed.data.isInternal : false

  const { error } = await supabase.from("issue_comments").insert({
    issue_id: parsed.data.issueId,
    author_id: user.id,
    body: parsed.data.body,
    is_internal: isInternal,
  })
  if (error) return { error: error.message }

  // Internal notes stay internal — never notify the client about one.
  if (!isInternal) {
    const { data: issue } = await supabase
      .from("issues")
      .select("title, org_id, reporter_id, assignee_id")
      .eq("id", parsed.data.issueId)
      .maybeSingle()
    if (issue) {
      await notify(supabase, {
        userIds: [issue.reporter_id, issue.assignee_id].filter((id): id is string => !!id),
        orgId: issue.org_id,
        type: "comment",
        title: `New comment from ${user.profile.full_name ?? "a teammate"}`,
        body: `${issue.title} — ${parsed.data.body.slice(0, 160)}`,
        link: `/tickets/${parsed.data.issueId}`,
        exceptUserId: user.id,
      })
    }
  }

  revalidatePath(`/tickets/${parsed.data.issueId}`)
  return { success: "Comment posted." }
}
