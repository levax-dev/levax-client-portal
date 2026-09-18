import { OrgBreakdown, type OrgBreakdownRow } from "@/components/dashboard/org-breakdown"
import { StaffContributions, type StaffContributionRow } from "@/components/dashboard/staff-contributions"
import { createClient } from "@/lib/supabase/server"

// ── Staff (cross-org) sections ──────────────────────────────────────────

export async function StaffOrgBreakdownSection() {
  const supabase = await createClient()
  const { data: ticketRows } = await supabase
    .from("issues")
    .select("org_id, organizations(name), board_columns(is_done_column)")
    .eq("type", "ticket")

  const breakdownMap = new Map<string, OrgBreakdownRow>()
  for (const row of ticketRows ?? []) {
    const org = row.organizations as unknown as { name: string } | null
    const column = row.board_columns as unknown as { is_done_column: boolean } | null
    if (!org) continue
    const existing = breakdownMap.get(row.org_id) ?? {
      orgId: row.org_id,
      orgName: org.name,
      openTickets: 0,
      resolvedTickets: 0,
      totalTickets: 0,
    }
    existing.totalTickets++
    if (column?.is_done_column) existing.resolvedTickets++
    else existing.openTickets++
    breakdownMap.set(row.org_id, existing)
  }
  const rows = Array.from(breakdownMap.values()).sort((a, b) => a.orgName.localeCompare(b.orgName))

  return <OrgBreakdown rows={rows} />
}

export async function StaffContributionsSection() {
  const supabase = await createClient()
  const { data: staffProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("platform_role", ["staff", "super_admin"])

  let rows: StaffContributionRow[] = []
  if (staffProfiles && staffProfiles.length > 0) {
    const staffIds = staffProfiles.map((p) => p.id)
    const { data: staffIssues } = await supabase
      .from("issues")
      .select("assignee_id, resolved_at")
      .in("assignee_id", staffIds)

    rows = staffProfiles.map((p) => {
      const assigned = staffIssues?.filter((i) => i.assignee_id === p.id) ?? []
      return {
        id: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        assigned: assigned.length,
        resolved: assigned.filter((i) => i.resolved_at).length,
      }
    })
  }

  return <StaffContributions rows={rows} />
}
