"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { notify } from "@/lib/notify"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema, decideProjectSchema } from "@/lib/validations/issue"

export type ActionState = { error?: string; success?: string } | null

/**
 * Proposes a project. It starts life as `pending` and does no work until
 * someone on the client side signs it off — the client's first screen is
 * "what am I being asked to approve?", and this is what puts things there.
 */
export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse({
    ...Object.fromEntries(formData),
    departmentIds: formData.getAll("departmentIds"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const { startDate, targetDate } = parsed.data
  if (startDate && targetDate && startDate > targetDate) {
    return { error: "The start date falls after the target delivery date." }
  }

  const user = await requireUser()
  const org = await getActiveOrg(user)
  if (!org) return { error: "No organization selected." }

  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: org.id,
      name: parsed.data.name,
      description: parsed.data.description,
      lead_id: parsed.data.leadId || null,
      start_date: startDate || null,
      target_date: targetDate || null,
      created_by: user.id,
      requested_by: user.id,
      // Staff propose; the client decides. A project raised by the client
      // side itself needs no second sign-off.
      approval_status: user.isStaff ? "pending" : "approved",
      status: user.isStaff ? "on_hold" : "active",
    })
    .select("id, approval_status")
    .single()
  if (error || !project) return { error: error?.message ?? "Could not create project." }

  const { error: seedError } = await supabase.rpc("seed_default_columns", {
    p_project_id: project.id,
  })
  if (seedError) return { error: seedError.message }

  const { error: deptError } = await supabase
    .from("project_departments")
    .insert(
      parsed.data.departmentIds.map((departmentId) => ({
        project_id: project.id,
        department_id: departmentId,
      }))
    )
  if (deptError) return { error: deptError.message }

  if (project.approval_status === "pending") {
    const { data: members } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", org.id)
    await notify(supabase, {
      userIds: (members ?? []).map((m) => m.user_id),
      orgId: org.id,
      type: "project_pending",
      title: "A project is waiting for your approval",
      body: parsed.data.name,
      link: "/projects",
      exceptUserId: user.id,
    })
  }

  revalidatePath("/projects")
  revalidatePath("/dashboard")
  redirect(`/projects/${project.id}`)
}

/**
 * Approve or reject a proposed project. Any member of the client org can
 * decide — the decision itself goes through a SECURITY DEFINER function, so
 * approving grants exactly that and can't be turned into a way to rename a
 * project or move its dates.
 */
export async function decideProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = decideProjectSchema.safeParse({
    projectId: formData.get("projectId"),
    approve: formData.get("approve") === "true",
    note: formData.get("note") || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  if (!parsed.data.approve && !parsed.data.note?.trim()) {
    return { error: "Tell us why, so the team knows what to change." }
  }

  const user = await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, name, lead_id, requested_by")
    .eq("id", parsed.data.projectId)
    .maybeSingle()
  if (!project) return { error: "Project not found." }

  const { error } = await supabase.rpc("decide_project", {
    p_project: parsed.data.projectId,
    p_approve: parsed.data.approve,
    p_note: parsed.data.note ?? null,
  })
  if (error) return { error: error.message }

  await notify(supabase, {
    userIds: [project.lead_id, project.requested_by].filter((id): id is string => !!id),
    orgId: project.org_id,
    type: parsed.data.approve ? "project_approved" : "project_rejected",
    title: parsed.data.approve ? "Project approved" : "Project sent back",
    body: parsed.data.note ? `${project.name} — ${parsed.data.note}` : project.name,
    link: `/projects/${project.id}`,
    exceptUserId: user.id,
  })

  revalidatePath("/projects")
  revalidatePath(`/projects/${project.id}`)
  revalidatePath("/dashboard")
  return { success: parsed.data.approve ? "Project approved." : "Project sent back to the team." }
}

/** Staff put a rejected project back in front of the client after revising it. */
export async function resubmitProject(id: string) {
  const user = await requireUser()
  if (!user.isStaff) return

  const supabase = await createClient()
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, name")
    .eq("id", id)
    .maybeSingle()
  if (!project) return

  await supabase
    .from("projects")
    .update({
      approval_status: "pending",
      decided_by: null,
      decided_at: null,
      decision_note: null,
      requested_by: user.id,
    })
    .eq("id", id)

  const { data: members } = await supabase
    .from("org_members")
    .select("user_id")
    .eq("org_id", project.org_id)

  await notify(supabase, {
    userIds: (members ?? []).map((m) => m.user_id),
    orgId: project.org_id,
    type: "project_pending",
    title: "A revised project is waiting for your approval",
    body: project.name,
    link: "/projects",
    exceptUserId: user.id,
  })

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
  revalidatePath("/dashboard")
}

export async function archiveProject(id: string) {
  const user = await requireUser()
  if (!user.isStaff) return
  const supabase = await createClient()
  await supabase.from("projects").update({ status: "archived" }).eq("id", id)
  revalidatePath("/projects")
}
