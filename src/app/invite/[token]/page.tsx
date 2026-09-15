import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { AcceptInviteForm } from "@/components/auth/accept-invite-form"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata: Metadata = { title: "Accept invite" }

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from("org_invites")
    .select("*, organizations(name)")
    .eq("token", token)
    .maybeSingle()

  if (!invite) notFound()

  const org = invite.organizations as unknown as { name: string } | null
  const isUsable = invite.status === "pending" && new Date(invite.expires_at) > new Date()

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Join {org?.name ?? "your team"} on Levax
          </h1>
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited as a {invite.role}. Set a password to finish creating your account.
          </p>
        </div>

        {isUsable ? (
          <AcceptInviteForm token={token} email={invite.email} />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            This invite link is no longer valid. Ask your Levax contact to resend it, or{" "}
            <Link href="/login" className="text-primary hover:underline">
              sign in
            </Link>{" "}
            if you already have an account.
          </p>
        )}
      </div>
    </div>
  )
}
