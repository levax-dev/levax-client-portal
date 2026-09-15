import type { Metadata } from "next"
import Link from "next/link"

import { NewTicketForm, type ProjectOption } from "@/components/tickets/new-ticket-form"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "New ticket" }

export default async function NewTicketPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)
  const supabase = await createClient()

  if (!org) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <PageHeader title="Raise a ticket" />
        <p className="text-sm text-muted-foreground">You&apos;re not part of an organization yet.</p>
      </div>
    )
  }

  const membership = user.memberships.find((m) => m.org.id === org.id)
  const isOrgAdmin = user.isStaff || membership?.role === "admin"

  const [{ data: projects }, { data: myDeptRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, project_departments(department_id, departments(id, name))")
      .eq("org_id", org.id)
      .eq("status", "active")
      .order("name"),
    membership
      ? supabase
          .from("org_members")
          .select("id, org_member_departments(department_id)")
          .eq("org_id", org.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const myDepartmentIds = new Set(
    ((myDeptRows?.org_member_departments as unknown as { department_id: string }[] | undefined) ?? []).map(
      (d) => d.department_id
    )
  )

  const projectOptions: ProjectOption[] = (projects ?? [])
    .map((p) => {
      const allDepts = (p.project_departments as unknown as { departments: { id: string; name: string } | null }[])
        .map((pd) => pd.departments)
        .filter((d): d is { id: string; name: string } => !!d)
      const visibleDepts = isOrgAdmin ? allDepts : allDepts.filter((d) => myDepartmentIds.has(d.id))
      return { id: p.id, name: p.name, departments: visibleDepts }
    })
    .filter((p) => p.departments.length > 0)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title="Raise a ticket" description="Tell us what's going on and we'll take it from here." />
      <Card>
        <CardContent className="pt-6">
          {projectOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              There&apos;s no project set up yet that you can raise a ticket into. Ask your{" "}
              {isOrgAdmin ? (
                <Link href="/team" className="text-primary hover:underline">
                  Leverage Axiom contact
                </Link>
              ) : (
                "org admin"
              )}{" "}
              to add you to a department with an active project.
            </p>
          ) : (
            <NewTicketForm projects={projectOptions} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
