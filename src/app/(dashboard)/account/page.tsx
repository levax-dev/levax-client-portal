import type { Metadata } from "next"

import { OrgProfileForm } from "@/components/account/org-profile-form"
import { ProfileForm } from "@/components/account/profile-form"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Account" }

export default async function AccountPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)
  const isOrgAdmin = user.isStaff || user.memberships.some((m) => m.org.id === org?.id && m.role === "admin")

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title="Account" description="Manage your profile and organization settings." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={user.profile.full_name ?? ""} email={user.email} />
        </CardContent>
      </Card>

      {org && isOrgAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgProfileForm orgName={org.name} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
