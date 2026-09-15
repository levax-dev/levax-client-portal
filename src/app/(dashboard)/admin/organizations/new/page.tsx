import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { NewOrganizationForm } from "@/components/admin/new-organization-form"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "New organization" }

export default async function NewOrganizationPage() {
  const user = await requireUser()
  if (!user.isStaff) redirect("/dashboard")

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader title="New organization" description="Onboard a new client onto the portal." />
      <Card>
        <CardContent className="pt-6">
          <NewOrganizationForm />
        </CardContent>
      </Card>
    </div>
  )
}
