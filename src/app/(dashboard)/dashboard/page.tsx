import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Book, Building2, KanbanSquare, Ticket as TicketIcon } from "lucide-react"

import {
  ClientActiveProjectsStat,
  ClientRecentActivitySection,
  ClientTotalTicketsStat,
  StaffActiveProjectsStat,
  StaffContributionsSection,
  StaffMyIssuesStat,
  StaffOpenTicketsStat,
  StaffOrgBreakdownSection,
  StaffRecentActivitySection,
  StaffTotalTasksStat,
} from "@/components/dashboard/dashboard-sections"
import {
  ActivitySkeleton,
  BreakdownSkeleton,
  ContributionsSkeleton,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons"
import { DepartmentFilter } from "@/components/dashboard/department-filter"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const user = await requireUser()
  const { dept: deptId } = await searchParams

  if (user.isStaff) {
    return (
      <StaffDashboard
        userId={user.id}
        isSuperAdmin={user.isSuperAdmin}
        firstName={user.profile.full_name?.split(" ")[0] ?? "there"}
      />
    )
  }

  const org = await getActiveOrg(user)

  if (!org) {
    return (
      <PageHeader
        title={`Welcome, ${user.profile.full_name ?? "there"}`}
        description="You're not part of an organization yet. Ask your Leverage Axiom contact for an invite."
      />
    )
  }

  const membership = user.memberships.find((m) => m.org.id === org.id)
  const isOrgAdmin = membership?.role === "admin"
  const supabase = await createClient()

  const { data: departments } = isOrgAdmin
    ? await supabase.from("departments").select("id, name").eq("org_id", org.id).order("name")
    : await supabase
        .from("org_members")
        .select("org_member_departments(departments(id, name))")
        .eq("org_id", org.id)
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => ({
          data: (
            (data?.org_member_departments as unknown as { departments: { id: string; name: string } | null }[]) ?? []
          )
            .map((d) => d.departments)
            .filter((d): d is { id: string; name: string } => !!d),
        }))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.profile.full_name?.split(" ")[0] ?? "there"}`}
        description={`Here's what's happening at ${org.name}.`}
        actions={
          <div className="flex items-center gap-2">
            <DepartmentFilter departments={departments ?? []} activeDeptId={deptId} />
            <Button render={<Link href="/tickets/new" />}>
              <TicketIcon />
              New ticket
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Suspense fallback={<StatCardSkeleton />}>
          <ClientActiveProjectsStat orgId={org.id} deptId={deptId} />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <ClientTotalTicketsStat orgId={org.id} deptId={deptId} />
        </Suspense>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<ActivitySkeleton />}>
          <ClientRecentActivitySection orgId={org.id} deptId={deptId} />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QuickLink href="/projects" icon={KanbanSquare} label="Browse projects" />
            <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
            <QuickLink href="/tickets/new" icon={TicketIcon} label="Raise a ticket" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StaffDashboard({
  userId,
  isSuperAdmin,
  firstName,
}: {
  userId: string
  isSuperAdmin: boolean
  firstName: string
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          isSuperAdmin
            ? "Here's how things look across every organization."
            : "Here's what's happening across all your organizations."
        }
        actions={
          <Button variant="outline" render={<Link href="/admin/organizations" />}>
            <Building2 />
            Manage organizations
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatCardSkeleton />}>
          <StaffTotalTasksStat />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <StaffOpenTicketsStat />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <StaffMyIssuesStat userId={userId} />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <StaffActiveProjectsStat />
        </Suspense>
      </div>

      <Suspense fallback={<BreakdownSkeleton />}>
        <StaffOrgBreakdownSection />
      </Suspense>

      {isSuperAdmin && (
        <Suspense fallback={<ContributionsSkeleton />}>
          <StaffContributionsSection />
        </Suspense>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<ActivitySkeleton />}>
          <StaffRecentActivitySection />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QuickLink href="/projects" icon={KanbanSquare} label="Browse projects" />
            <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
            <QuickLink href="/tickets/new" icon={TicketIcon} label="Raise a ticket" />
            <QuickLink href="/admin/organizations" icon={Building2} label="Organizations" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof TicketIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 text-sm hover:bg-accent">
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  )
}
