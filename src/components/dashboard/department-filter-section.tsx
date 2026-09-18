import { DepartmentFilter } from "@/components/dashboard/department-filter"
import { createClient } from "@/lib/supabase/server"

/**
 * Loads the departments the viewer may filter by: every department in the org
 * for an admin, only their own for a regular member.
 */
export async function DepartmentFilterSection({
  orgId,
  userId,
  isOrgAdmin,
  activeDeptId,
}: {
  orgId: string
  userId: string
  isOrgAdmin: boolean
  activeDeptId?: string
}) {
  const supabase = await createClient()

  if (isOrgAdmin) {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name")
    return <DepartmentFilter departments={data ?? []} activeDeptId={activeDeptId} />
  }

  const { data } = await supabase
    .from("org_members")
    .select("org_member_departments(departments(id, name))")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()

  const departments = (
    (data?.org_member_departments as unknown as
      | { departments: { id: string; name: string } | null }[]
      | undefined) ?? []
  )
    .map((row) => row.departments)
    .filter((d): d is { id: string; name: string } => !!d)

  return <DepartmentFilter departments={departments} activeDeptId={activeDeptId} />
}
