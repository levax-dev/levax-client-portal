import { TeamListSection } from "@/components/team/team-list-section"
import { createClient } from "@/lib/supabase/server"

export async function OrganizationDetailSection({ orgId, currentUserId }: { orgId: string; currentUserId: string }) {
  const supabase = await createClient()
  const { count: projectCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
  const { count: memberCount } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {projectCount ?? 0} projects · {memberCount ?? 0} members
      </p>
      <TeamListSection orgId={orgId} currentUserId={currentUserId} />
    </div>
  )
}
