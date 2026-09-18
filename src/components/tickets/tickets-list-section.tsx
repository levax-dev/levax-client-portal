import { OrgSwitcher } from "@/components/layout/org-switcher"
import { TicketsTable, type TicketRow } from "@/components/tickets/tickets-table"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export async function TicketsListSection({ orgParam }: { orgParam?: string }) {
  const viewer = await getViewer()
  const supabase = await createClient()

  let org = viewer.org
  let organizations: { id: string; name: string }[] | null = null

  if (viewer.isStaff) {
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
          `id, title, priority, category, created_at, resolved_at, due_date, reporter_id, project_id,
           department_id, departments(name), board_columns(name, color),
           profiles!issues_assignee_id_fkey(id, full_name, avatar_url)`
        )
        .eq("org_id", org.id)
        .eq("type", "ticket")
        .order("created_at", { ascending: false })
    : { data: [] }

  const ticketIds = (data ?? []).map((row) => row.id)

  // How much work each ticket has spawned, and how much of it has landed —
  // one query for the whole page rather than a count per row.
  const { data: childRows } = ticketIds.length
    ? await supabase
        .from("issues")
        .select("parent_ticket_id, resolved_at")
        .in("parent_ticket_id", ticketIds)
    : { data: [] }

  const childCounts = new Map<string, { total: number; done: number }>()
  for (const row of childRows ?? []) {
    if (!row.parent_ticket_id) continue
    const entry = childCounts.get(row.parent_ticket_id) ?? { total: 0, done: 0 }
    entry.total++
    if (row.resolved_at) entry.done++
    childCounts.set(row.parent_ticket_id, entry)
  }

  const tickets: TicketRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    category: row.category,
    created_at: row.created_at,
    resolvedAt: row.resolved_at,
    dueDate: row.due_date,
    reporterId: row.reporter_id,
    projectId: row.project_id,
    department: (row.departments as unknown as { name: string } | null)?.name ?? null,
    column: (row.board_columns as unknown as TicketRow["column"]) ?? null,
    assignee: (row.profiles as unknown as TicketRow["assignee"]) ?? null,
    tasks: childCounts.get(row.id) ?? { total: 0, done: 0 },
  }))

  return (
    <div className="space-y-6">
      {viewer.isStaff && organizations && (
        <OrgSwitcher organizations={organizations} activeOrgId={org?.id ?? null} />
      )}
      <TicketsTable
        tickets={tickets}
        currentUserId={viewer.user.id}
        leadProjectIds={viewer.ledProjectIds}
        isStaff={viewer.isStaff}
      />
    </div>
  )
}
