import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { KanbanBoard, type KanbanColumn } from "@/components/projects/kanban-board"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Project board" }

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle()
  if (!project) notFound()

  const [{ data: columns }, { data: issues }, { data: members }] = await Promise.all([
    supabase.from("board_columns").select("id, name, color").eq("project_id", id).order("position"),
    supabase
      .from("issues")
      .select(
        "id, title, priority, type, position, column_id, assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url)"
      )
      .eq("project_id", id)
      .order("position"),
    supabase.from("org_members").select("profiles(id, full_name)").eq("org_id", project.org_id),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <Badge variant="secondary" className="capitalize">
            {project.status.replace("_", " ")}
          </Badge>
        }
      />
      <KanbanBoard projectId={project.id} initialColumns={kanbanColumns} assignableUsers={assignableUsers} />
    </div>
  )
}
