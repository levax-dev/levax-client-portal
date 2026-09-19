import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { NewProjectForm } from "@/components/projects/new-project-form"
import { Card, CardContent } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "New project" }

export default async function NewProjectPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)
  const supabase = await createClient()

  const [{ data: departments }, { data: staffProfiles }] = await Promise.all([
    org ? supabase.from("departments").select("id, name").eq("org_id", org.id).order("name") : Promise.resolve({ data: [] }),
    // Only a super admin may hand the lead to someone else, so everyone else
    // is offered exactly one choice besides "unassigned": themselves.
    user.isSuperAdmin
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("platform_role", ["staff", "super_admin"])
          .order("full_name")
      : user.isStaff
        ? supabase.from("profiles").select("id, full_name").eq("id", user.id)
        : // A client admin can create a project but not staff it — a lead is
          // one of our people, assigned on the board afterwards.
          Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader title="New project" description="Spin up a Kanban board to track work." />
      <Card>
        <CardContent className="space-y-4 pt-6">
          {(!departments || departments.length === 0) && (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              This organization has no departments yet. Add one from the{" "}
              <Link href="/team" className="text-primary hover:underline">
                Team page
              </Link>{" "}
              before creating a project — clients can only raise tickets into a project once it has at
              least one department attached.
            </p>
          )}
          <NewProjectForm
            departments={departments ?? []}
            staffProfiles={staffProfiles ?? []}
            needsApproval={user.isStaff}
            canAssignAnyLead={user.isSuperAdmin}
          />
        </CardContent>
      </Card>
    </div>
  )
}
