import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { OrganizationsListSection } from "@/components/admin/organizations-list-section"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Organizations" }

export default async function OrganizationsPage() {
  const user = await requireUser()
  if (!user.isStaff) redirect("/dashboard")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Every client organization on the platform."
        actions={
          <Button render={<Link href="/admin/organizations/new" />}>
            <Plus />
            New organization
          </Button>
        }
      />
      <Suspense fallback={<LoadingSpinner />}>
        <OrganizationsListSection />
      </Suspense>
    </div>
  )
}
