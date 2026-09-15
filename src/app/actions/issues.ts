"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Issue, IssuePriority } from "@/types/database"
import {
  commentSchema,
  createIssueSchema,
  createTicketSchema,
  moveIssueSchema,
  updateIssueSchema,
} from "@/lib/validations/issue"

export type ActionState = { error?: string; success?: string } | null

/** Raises a new support ticket in the active org's default Support project. */
export async function createTicket(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createTicketSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const org = await getActiveOrg(user)
  if (!org) return { error: "No organization selected." }

  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", org.id)
    .eq("is_support_project", true)
    .single()
  if (!project) return { error: "Support project not found for this organization." }

  const { data: column } = await supabase
    .from("board_columns")
    .select("id")
    .eq("project_id", project.id)
    .order("position")
    .limit(1)
    .single()
  if (!column) return { error: "Support board is not set up correctly." }

  const { data: issue, error } = await supabase
    .from("issues")
    .insert({
      org_id: org.id,
      project_id: project.id,
      column_id: column.id,
      type: "ticket",
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      reporter_id: user.id,
    })
    .select("id")
    .single()
  if (error || !issue) return { error: error?.message ?? "Could not create ticket." }

  revalidatePath("/tickets")
  redirect(`/tickets/${issue.id}`)
}

/** Creates a work item (task/bug/feature/ticket) directly on a project board. */
export async function createIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const parsed = createIssueSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", parsed.data.projectId)
    .single()
  if (!project) return { error: "Project not found." }

  const { error } = await supabase.from("issues").insert({
    org_id: project.org_id,
    project_id: parsed.data.projectId,
    column_id: parsed.data.columnId,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    reporter_id: user.id,
    assignee_id: parsed.data.assigneeId || null,
    due_date: parsed.data.dueDate || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/projects/${parsed.data.projectId}`)
  return { success: "Issue created." }
}

export async function updateIssue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData)
  const parsed = updateIssueSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { id, ...rest } = parsed.data

  const update: Partial<Issue> = {}
  if (rest.title !== undefined) update.title = rest.title
  if (rest.description !== undefined) update.description = rest.description
  if (rest.priority !== undefined) update.priority = rest.priority
  if (rest.assigneeId !== undefined) update.assignee_id = rest.assigneeId || null
  if (rest.dueDate !== undefined) update.due_date = rest.dueDate || null

  const { error } = await supabase.from("issues").update(update).eq("id", id)
  if (error) return { error: error.message }

  revalidatePath(`/tickets/${id}`)
  return { success: "Saved." }
}

/** Moves an issue to a new column/position — used by the Kanban board drag-and-drop. */
export async function moveIssue(input: { id: string; columnId: string; position: number }) {
  const parsed = moveIssueSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid move." }

  const supabase = await createClient()

  const { data: column } = await supabase
    .from("board_columns")
    .select("is_done_column, project_id")
    .eq("id", parsed.data.columnId)
    .single()

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
  revalidatePath("/tickets")
  return { success: true }
}

export async function setIssuePriority(id: string, priority: IssuePriority) {
  const supabase = await createClient()
  await supabase.from("issues").update({ priority }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

export async function setIssueAssignee(id: string, assigneeId: string | null) {
  const supabase = await createClient()
  await supabase.from("issues").update({ assignee_id: assigneeId }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

export async function setIssueColumn(id: string, columnId: string) {
  const supabase = await createClient()
  const { data: column } = await supabase
    .from("board_columns")
    .select("is_done_column, project_id")
    .eq("id", columnId)
    .single()

  await supabase
    .from("issues")
    .update({
      column_id: columnId,
      resolved_at: column?.is_done_column ? new Date().toISOString() : null,
    })
    .eq("id", id)

  revalidatePath(`/tickets/${id}`)
  if (column?.project_id) revalidatePath(`/projects/${column.project_id}`)
}

export async function setIssueDueDate(id: string, dueDate: string | null) {
  const supabase = await createClient()
  await supabase.from("issues").update({ due_date: dueDate }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

/** Staff-only: associate a ticket with a broader project for context, without moving it off the support board. */
export async function setIssueLinkedProject(id: string, projectId: string | null) {
  const user = await requireUser()
  if (!user.isStaff) return
  const supabase = await createClient()
  await supabase.from("issues").update({ linked_project_id: projectId }).eq("id", id)
  revalidatePath(`/tickets/${id}`)
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    ...Object.fromEntries(formData),
    isInternal: formData.get("isInternal") === "on" || formData.get("isInternal") === "true",
  }
  const parsed = commentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()

  const { error } = await supabase.from("issue_comments").insert({
    issue_id: parsed.data.issueId,
    author_id: user.id,
    body: parsed.data.body,
    is_internal: user.isStaff ? parsed.data.isInternal : false,
  })
  if (error) return { error: error.message }

  revalidatePath(`/tickets/${parsed.data.issueId}`)
  return { success: "Comment posted." }
}
