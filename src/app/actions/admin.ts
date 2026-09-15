"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { sendInviteEmail } from "@/lib/email"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/slug"
import { createOrgSchema } from "@/lib/validations/org"

export type ActionState = { error?: string; success?: string } | null

/** Staff-only: create a new client organization and invite its first admin. */
export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createOrgSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  if (!user.isStaff) return { error: "Only staff can create organizations." }

  const supabase = await createClient()

  const baseSlug = slugify(parsed.data.name)
  let slug = baseSlug
  for (let i = 1; i <= 5; i++) {
    const { data: existing } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${i}`
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.name, slug })
    .select("id")
    .single()
  if (error || !org) return { error: error?.message ?? "Could not create organization." }

  const { data: invite, error: inviteError } = await supabase
    .from("org_invites")
    .insert({ org_id: org.id, email: parsed.data.adminEmail, role: "admin", invited_by: user.id })
    .select("token")
    .single()
  if (inviteError || !invite) return { error: inviteError?.message ?? "Organization created, but the invite failed." }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`
  await sendInviteEmail(parsed.data.adminEmail, parsed.data.name, inviteUrl)

  revalidatePath("/admin/organizations")
  redirect(`/admin/organizations/${org.id}`)
}

export async function suspendOrganization(id: string) {
  const supabase = await createClient()
  await supabase.from("organizations").update({ status: "suspended" }).eq("id", id)
  revalidatePath("/admin/organizations")
}

export async function reactivateOrganization(id: string) {
  const supabase = await createClient()
  await supabase.from("organizations").update({ status: "active" }).eq("id", id)
  revalidatePath("/admin/organizations")
}
