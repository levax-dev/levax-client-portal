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
  issueTitle,
  projectId,
  orgId,
  currentColumnId,
  priority,
  assignee,
  reporter,
  startDate,
  dueDate,
  estimatedHours,
  isResolved,
  canEdit,
  showLinkedProject,
  linkedProject,
}: {
  issueId: string
  issueTitle: string
  projectId: string
  orgId: string
  currentColumnId: string
  priority: IssuePriority
  assignee: Person | null
  reporter: Person | null
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  isResolved: boolean
  canEdit: boolean
  showLinkedProject: boolean
  linkedProject: { id: string; name: string } | null
}) {
  const supabase = await createClient()

  const [{ data: columns }, { data: assignableUsers }, { data: linkableProjects }] =
    await Promise.all([
      supabase
        .from("board_columns")
        .select("id, name, color")
        .eq("project_id", projectId)
        .order("position"),
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("platform_role", ["staff", "super_admin"])
        .order("full_name"),
      showLinkedProject
        ? supabase
            .from("projects")
            .select("id, name")
            .eq("org_id", orgId)
            .eq("is_support_project", false)
            .eq("approval_status", "approved")
            .eq("status", "active")
            .order("name")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

  return (
    <IssueSidebar
      issueId={issueId}
      issueTitle={issueTitle}
      columns={columns ?? []}
      currentColumnId={currentColumnId}
      priority={priority}
      assignee={assignee}
      reporter={reporter}
      startDate={startDate}
      dueDate={dueDate}
      estimatedHours={estimatedHours}
      isResolved={isResolved}
      assignableUsers={assignableUsers ?? []}
      canEdit={canEdit}
      showLinkedProject={showLinkedProject}
      linkedProject={linkedProject}
      linkableProjects={linkableProjects ?? []}
    />
  )
}
