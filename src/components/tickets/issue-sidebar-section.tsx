import { IssueSidebar } from "@/components/tickets/issue-sidebar"
import { createClient } from "@/lib/supabase/server"
import type { IssuePriority } from "@/types/database"

interface Person {
  id: string
  full_name: string | null
  avatar_url?: string | null
}

export async function IssueSidebarSection({
  issueId,
  projectId,
  orgId,
  currentColumnId,
  priority,
  assignee,
  reporter,
  dueDate,
  canEdit,
  showLinkedProject,
  linkedProject,
}: {
  issueId: string
  projectId: string
  orgId: string
  currentColumnId: string
  priority: IssuePriority
  assignee: Person | null
  reporter: Person | null
  dueDate: string | null
  canEdit: boolean
  showLinkedProject: boolean
  linkedProject: { id: string; name: string } | null
}) {
  const supabase = await createClient()

  const [{ data: columns }, { data: assignableUsers }, { data: linkableProjects }] = await Promise.all([
    supabase.from("board_columns").select("id, name, color").eq("project_id", projectId).order("position"),
    supabase.from("org_members").select("profiles(id, full_name, avatar_url)").eq("org_id", orgId),
    showLinkedProject
      ? supabase
          .from("projects")
          .select("id, name")
          .eq("org_id", orgId)
          .eq("is_support_project", false)
          .eq("status", "active")
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const assignees = (assignableUsers ?? [])
    .map((row) => row.profiles as unknown as Person | null)
    .filter((p): p is Person => !!p)

  return (
    <IssueSidebar
      issueId={issueId}
      columns={columns ?? []}
      currentColumnId={currentColumnId}
      priority={priority}
      assignee={assignee}
      reporter={reporter}
      dueDate={dueDate}
      assignableUsers={assignees}
      canEdit={canEdit}
      showLinkedProject={showLinkedProject}
      linkedProject={linkedProject}
      linkableProjects={linkableProjects ?? []}
    />
  )
}
