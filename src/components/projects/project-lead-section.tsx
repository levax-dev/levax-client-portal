import { ProjectLeadControl, type StaffOption } from "@/components/projects/project-lead-control"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

/**
 * Loads who leads a project and, for whoever may reassign it, the staff to pick
 * from. Clients see the name only — knowing who owns their project is useful,
 * but the roster of internal staff isn't theirs to browse.
 */
export async function ProjectLeadSection({
  projectId,
  leadId,
}: {
  projectId: string
  leadId: string | null
}) {
  const viewer = await getViewer()
  const supabase = await createClient()

  const canAssign = viewer.isSuperAdmin || (!!leadId && leadId === viewer.user.id)

  const [{ data: lead }, { data: staff }] = await Promise.all([
    leadId
      ? supabase.from("profiles").select("id, full_name, avatar_url").eq("id", leadId).maybeSingle()
      : Promise.resolve({ data: null }),
    canAssign
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("platform_role", ["staff", "super_admin"])
          .order("full_name")
      : Promise.resolve({ data: [] as StaffOption[] }),
  ])

  return (
    <ProjectLeadControl
      projectId={projectId}
      lead={lead ?? null}
      staff={staff ?? []}
      canAssign={canAssign}
    />
  )
}
