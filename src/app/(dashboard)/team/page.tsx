import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { MembersTable, type MemberRow } from "@/components/team/members-table"
import { PendingInvites, type InviteRow } from "@/components/team/pending-invites"
import { PageHeader } from "@/components/page-header"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Team" }

export default async function TeamPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)

  const isOrgAdmin = user.isStaff || user.memberships.some((m) => m.org.id === org?.id && m.role === "admin")
  if (!isOrgAdmin) redirect("/dashboard")
  if (!org) redirect("/dashboard")

  const supabase = await createClient()

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id, role, profiles(id, full_name, email, avatar_url)")
      .eq("org_id", org.id),
    supabase
      .from("org_invites")
      .select("*")
      .eq("org_id", org.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ])

  const memberRows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    profile: m.profiles as unknown as MemberRow["profile"],
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`People with access to ${org.name}.`}
        actions={<InviteMemberDialog />}
      />

      <MembersTable members={memberRows} currentUserId={user.id} />

      <PendingInvites invites={(invites ?? []) as InviteRow[]} />
    </div>
  )
}
