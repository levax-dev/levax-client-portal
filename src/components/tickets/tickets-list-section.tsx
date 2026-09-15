import { OrgSwitcher } from "@/components/layout/org-switcher"
import { TicketsTable, type TicketRow } from "@/components/tickets/tickets-table"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function TicketsListSection({ orgParam }: { orgParam?: string }) {
  const user = await requireUser()
  const supabase = await createClient()

  let org = await getActiveOrg(user)
  let organizations: { id: string; name: string }[] | null = null

  if (user.isStaff) {
    const [{ data: allOrgs }, { data: paramOrg }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      orgParam
        ? supabase.from("organizations").select("*").eq("id", orgParam).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    organizations = allOrgs
    if (paramOrg) org = paramOrg
  }

  const { data } = org
    ? await supabase
        .from("issues")
        .select(
          "id, title, priority, created_at, reporter_id, project_id, department_id, departments(name), board_columns(name, color), profiles!issues_assignee_id_fkey(id, full_name, avatar_url)"
        )
        .eq("org_id", org.id)
        .eq("type", "ticket")
        .order("created_at", { ascending: false })
    : { data: [] }

  const tickets: TicketRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    created_at: row.created_at,
    reporterId: row.reporter_id,
    projectId: row.project_id,
    department: (row.departments as unknown as { name: string } | null)?.name ?? null,
    column: (row.board_columns as unknown as TicketRow["column"]) ?? null,
    assignee: (row.profiles as unknown as TicketRow["assignee"]) ?? null,
  }))

  const { data: ledProjects } = org
    ? await supabase.from("projects").select("id").eq("org_id", org.id).eq("lead_id", user.id)
    : { data: [] }
  const leadProjectIds = (ledProjects ?? []).map((p) => p.id)

  return (
    <div className="space-y-6">
      {user.isStaff && organizations && (
        <OrgSwitcher organizations={organizations} activeOrgId={org?.id ?? null} />
      )}
      <TicketsTable tickets={tickets} currentUserId={user.id} leadProjectIds={leadProjectIds} />
    </div>
  )
}
