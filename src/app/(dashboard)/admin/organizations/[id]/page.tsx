import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { OrgStatusActions } from "@/components/admin/org-status-actions"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { MembersTable, type MemberRow } from "@/components/team/members-table"
import { PendingInvites, type InviteRow } from "@/components/team/pending-invites"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Organization" }

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  if (!user.isStaff) redirect("/dashboard")

  const supabase = await createClient()
  const { data: org } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle()
  if (!org) notFound()

  const [{ data: members }, { data: invites }, { count: projectCount }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id, role, profiles(id, full_name, email, avatar_url)")
      .eq("org_id", id),
    supabase.from("org_invites").select("*").eq("org_id", id).eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("org_id", id),
  ])

  const memberRows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    profile: m.profiles as unknown as MemberRow["profile"],
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        description={`${projectCount ?? 0} projects · ${memberRows.length} members`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={org.status === "active" ? "secondary" : "destructive"} className="capitalize">
              {org.status}
            </Badge>
            <OrgStatusActions orgId={org.id} status={org.status} />
            <InviteMemberDialog orgId={org.id} />
          </div>
        }
      />

      <MembersTable members={memberRows} currentUserId={user.id} />
      <PendingInvites invites={(invites ?? []) as InviteRow[]} />
    </div>
  )
}
