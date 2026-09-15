import { DepartmentsPanel } from "@/components/team/departments-panel"
import { MembersTable, type MemberRow } from "@/components/team/members-table"
import { PendingInvites, type InviteRow } from "@/components/team/pending-invites"
import { createClient } from "@/lib/supabase/server"

export async function TeamListSection({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const supabase = await createClient()

  const [{ data: members }, { data: invites }, { data: departments }] = await Promise.all([
    supabase
      .from("org_members")
      .select("id, role, profiles(id, full_name, email, avatar_url), org_member_departments(department_id)")
      .eq("org_id", orgId),
    supabase
      .from("org_invites")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("departments").select("id, name").eq("org_id", orgId).order("name"),
  ])

  const memberRows: MemberRow[] = (members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    profile: m.profiles as unknown as MemberRow["profile"],
    departmentIds: ((m.org_member_departments as unknown as { department_id: string }[] | null) ?? []).map(
      (d) => d.department_id
    ),
  }))

  return (
    <div className="space-y-6">
      <MembersTable members={memberRows} currentUserId={currentUserId} departments={departments ?? []} />
      <DepartmentsPanel departments={departments ?? []} />
      <PendingInvites invites={(invites ?? []) as InviteRow[]} />
    </div>
  )
}
