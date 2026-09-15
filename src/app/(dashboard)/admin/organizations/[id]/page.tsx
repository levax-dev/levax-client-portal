import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"

import { OrganizationDetailSection } from "@/components/admin/organization-detail-section"
import { OrgStatusActions } from "@/components/admin/org-status-actions"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Organization" }

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  if (!user.isStaff) redirect("/dashboard")

  const supabase = await createClient()
  const { data: org } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle()
  if (!org) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={org.status === "active" ? "secondary" : "destructive"} className="capitalize">
              {org.status}
            </Badge>
            <OrgStatusActions orgId={org.id} status={org.status} />
            <InviteMemberDialog orgId={org.id} />
          </div>
        }
      />
      <Suspense fallback={<LoadingSpinner />}>
        <OrganizationDetailSection orgId={org.id} currentUserId={user.id} />
      </Suspense>
    </div>
  )
}
