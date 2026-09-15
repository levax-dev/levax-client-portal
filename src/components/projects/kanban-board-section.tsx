import { KanbanBoard, type KanbanColumn } from "@/components/projects/kanban-board"
import { createClient } from "@/lib/supabase/server"

export async function KanbanBoardSection({ projectId, orgId }: { projectId: string; orgId: string }) {
  const supabase = await createClient()

  const [{ data: columns }, { data: issues }, { data: members }] = await Promise.all([
    supabase.from("board_columns").select("id, name, color").eq("project_id", projectId).order("position"),
    supabase
      .from("issues")
      .select(
        "id, title, priority, type, position, column_id, assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url)"
      )
      .eq("project_id", projectId)
      .order("position"),
    supabase.from("org_members").select("profiles(id, full_name)").eq("org_id", orgId),
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

  const assignableUsers = (members ?? [])
    .map((m) => m.profiles as unknown as { id: string; full_name: string | null } | null)
    .filter((p): p is { id: string; full_name: string | null } => !!p)

  return <KanbanBoard projectId={projectId} initialColumns={kanbanColumns} assignableUsers={assignableUsers} />
}
