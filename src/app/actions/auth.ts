"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  acceptInviteSchema,
  forgotPasswordSchema,
  loginSchema,
  magicLinkSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth"

export type ActionState = { error?: string; success?: string } | null

export async function signInWithPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  redirect((formData.get("next") as string) || "/dashboard")
}

export async function signInWithMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/dashboard`,
    },
  })
  if (error) return { error: error.message }

  return { success: "Check your inbox for a sign-in link." }
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
  })
  if (error) return { error: error.message }

  return { success: "If an account exists for that email, a reset link is on its way." }
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }

  redirect("/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

/**
 * Accepts an org invite: creates the auth user (or reuses the current session
 * if already logged in with the invited email), joins the org, and marks the
 * invite accepted. `token` identifies the org_invites row.
 */
export async function acceptInvite(
  token: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const admin = createAdminClient()

  const { data: invite } = await admin
    .from("org_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .maybeSingle()

  if (!invite) return { error: "This invite is invalid or has already been used." }
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite has expired." }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  })
  if (createError) return { error: createError.message }

  const userId = created.user?.id
  if (!userId) return { error: "Could not create your account. Please try again." }

  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: invite.org_id, user_id: userId, role: invite.role })
  if (memberError) return { error: memberError.message }

  await admin.from("org_invites").update({ status: "accepted" }).eq("id", invite.id)

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: parsed.data.password,
  })
  if (signInError) return { success: "Account created — head to the login page to sign in." }

  revalidatePath("/team")
  redirect("/dashboard")
}
