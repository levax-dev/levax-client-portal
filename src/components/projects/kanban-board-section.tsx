import { KanbanBoard, type KanbanColumn } from "@/components/projects/kanban-board"
import type { TicketOption } from "@/components/projects/new-issue-dialog"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function KanbanBoardSection({
  projectId,
  orgId,
}: {
  projectId: string
  orgId: string
}) {
  const user = await requireUser()
  const supabase = await createClient()
  const canEdit = user.isStaff

  const [{ data: columns }, { data: issues }, { data: staffProfiles }, { data: tickets }] =
    await Promise.all([
      supabase
        .from("board_columns")
        .select("id, name, color")
        .eq("project_id", projectId)
        .order("position"),
      supabase
        .from("issues")
        .select(
          "id, title, priority, type, position, column_id, assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url)"
        )
        .eq("project_id", projectId)
        .order("position"),
      // Work is assigned to Leverage Axiom staff, not to the client's own members.
      canEdit
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .in("platform_role", ["staff", "super_admin"])
            .order("full_name")
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      // Candidate root tickets for a new task — every task needs one.
      canEdit
        ? supabase
            .from("issues")
            .select("id, title")
            .eq("org_id", orgId)
            .eq("type", "ticket")
            .is("resolved_at", null)
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] as TicketOption[] }),
    ])

  const kanbanColumns: KanbanColumn[] = (columns ?? []).map((col) => ({
    id: col.id,
    name: col.name,
    color: col.color,
    issues: (issues ?? [])
      .filter((issue) => issue.column_id === col.id)
      .map((issue) => ({
        id: issue.id,
        title: issue.title,
        priority: issue.priority,
        type: issue.type,
        position: issue.position,
        assignee: issue.assignee as unknown as KanbanColumn["issues"][number]["assignee"],
      })),
  }))

  return (
    <KanbanBoard
      projectId={projectId}
      initialColumns={kanbanColumns}
      assignableUsers={staffProfiles ?? []}
      tickets={tickets ?? []}
      canEdit={canEdit}
    />
  )
}
