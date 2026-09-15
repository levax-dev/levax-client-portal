import { MembersTable, type MemberRow } from "@/components/team/members-table"
import { PendingInvites, type InviteRow } from "@/components/team/pending-invites"
import { createClient } from "@/lib/supabase/server"

export async function TeamListSection({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const supabase = await createClient()

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id, role, profiles(id, full_name, email, avatar_url)")
      .eq("org_id", orgId),
    supabase
      .from("org_invites")
      .select("*")
      .eq("org_id", orgId)
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
      <MembersTable members={memberRows} currentUserId={currentUserId} />
      <PendingInvites invites={(invites ?? []) as InviteRow[]} />
    </div>
  )
}
