"use server"

import { revalidatePath } from "next/cache"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { updateOrgSchema, updateProfileSchema } from "@/lib/validations/org"

export type ActionState = { error?: string; success?: string } | null

export async function updateOrgProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateOrgSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const org = await getActiveOrg(user)
  if (!org) return { error: "No organization selected." }

  const supabase = await createClient()
  const { error } = await supabase.from("organizations").update({ name: parsed.data.name }).eq("id", org.id)
  if (error) return { error: error.message }

  revalidatePath("/account")
  return { success: "Organization updated." }
}

export async function updateOwnProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      job_title: parsed.data.jobTitle || null,
      location: parsed.data.location || null,
      bio: parsed.data.bio || null,
      ...(parsed.data.weeklyCapacityHours !== undefined
        ? { weekly_capacity_hours: parsed.data.weeklyCapacityHours }
        : {}),
    })
    .eq("id", user.id)
  if (error) return { error: error.message }

  revalidatePath("/account")
  revalidatePath("/team-tracking")
  return { success: "Profile updated." }
}
