"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createProjectSchema } from "@/lib/validations/issue"

export type ActionState = { error?: string; success?: string } | null

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

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
      created_by: user.id,
    })
    .select("id")
    .single()
  if (error || !project) return { error: error?.message ?? "Could not create project." }

  const { error: seedError } = await supabase.rpc("seed_default_columns", {
    p_project_id: project.id,
  })
  if (seedError) return { error: seedError.message }

  revalidatePath("/projects")
  redirect(`/projects/${project.id}`)
}

export async function archiveProject(id: string) {
  const supabase = await createClient()
  await supabase.from("projects").update({ status: "archived" }).eq("id", id)
  revalidatePath("/projects")
}
