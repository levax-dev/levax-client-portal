"use server"

import { revalidatePath } from "next/cache"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { sendInviteEmail } from "@/lib/email"
import { createClient } from "@/lib/supabase/server"
import { inviteMemberSchema } from "@/lib/validations/org"

export type ActionState = { error?: string; success?: string } | null

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inviteMemberSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const overrideOrgId = formData.get("orgId") as string | null

  const supabase = await createClient()

  const org = overrideOrgId
    ? (await supabase.from("organizations").select("*").eq("id", overrideOrgId).maybeSingle()).data
    : await getActiveOrg(user)
  if (!org) return { error: "No organization selected." }

  const { data: invite, error } = await supabase
    .from("org_invites")
    .insert({ org_id: org.id, email: parsed.data.email, role: parsed.data.role, invited_by: user.id })
    .select("token")
    .single()
  if (error || !invite) return { error: error?.message ?? "Could not create invite." }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invite.token}`
  await sendInviteEmail(parsed.data.email, org.name, inviteUrl)

  revalidatePath("/team")
  return { success: `Invite sent to ${parsed.data.email}.` }
}

export async function revokeInvite(id: string) {
  const supabase = await createClient()
  await supabase.from("org_invites").update({ status: "revoked" }).eq("id", id)
  revalidatePath("/team")
}

export async function updateMemberRole(memberId: string, role: "admin" | "member") {
  const supabase = await createClient()
  await supabase.from("org_members").update({ role }).eq("id", memberId)
  revalidatePath("/team")
}

export async function removeMember(memberId: string) {
  const supabase = await createClient()
  await supabase.from("org_members").delete().eq("id", memberId)
  revalidatePath("/team")
}
