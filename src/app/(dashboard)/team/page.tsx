import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { TeamListSection } from "@/components/team/team-list-section"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { getActiveOrg, requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Team" }

export default async function TeamPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)

  const isOrgAdmin = user.isStaff || user.memberships.some((m) => m.org.id === org?.id && m.role === "admin")
  if (!isOrgAdmin) redirect("/dashboard")
  if (!org) redirect("/dashboard")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`People with access to ${org.name}.`}
        actions={<InviteMemberDialog />}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <TeamListSection orgId={org.id} currentUserId={user.id} />
      </Suspense>
    </div>
  )
}
