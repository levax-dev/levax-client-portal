import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Building2, Ticket as TicketIcon } from "lucide-react"

import { ClientDashboard } from "@/components/dashboard/client-dashboard"
import { StaffDashboard } from "@/components/dashboard/staff-dashboard"
import {
  StaffContributionsSection,
  StaffOrgBreakdownSection,
} from "@/components/dashboard/dashboard-sections"
import {
  BreakdownSkeleton,
  ContributionsSkeleton,
  StatCardSkeleton,
} from "@/components/dashboard/dashboard-skeletons"
import { DepartmentFilterSection } from "@/components/dashboard/department-filter-section"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { todayISO } from "@/lib/periods"
import { ROLE_LABELS, getViewer } from "@/lib/roles"

export const metadata: Metadata = { title: "Dashboard" }

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>
}) {
  const { dept: deptId } = await searchParams
  const viewer = await getViewer()
  const today = todayISO()
  const firstName = viewer.user.profile.full_name?.split(" ")[0] ?? "there"

  if (viewer.isStaff) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${firstName}`}
          description={
            viewer.isProjectLead
              ? "Your queue, and how your projects are tracking."
              : "What's on your plate, and what's slipping."
          }
          actions={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border px-2.5 py-1 text-xs text-muted-foreground sm:inline">
                {ROLE_LABELS[viewer.role]}
              </span>
              <Button variant="outline" render={<Link href="/admin/organizations" />}>
                <Building2 />
                Organizations
              </Button>
            </div>
          }
        />

        <Suspense fallback={<DashboardSkeleton />}>
          <StaffDashboard today={today} />
        </Suspense>

        {viewer.isSuperAdmin && (
          <>
            <Suspense fallback={<BreakdownSkeleton />}>
              <StaffOrgBreakdownSection />
            </Suspense>
            <Suspense fallback={<ContributionsSkeleton />}>
              <StaffContributionsSection />
            </Suspense>
          </>
        )}
      </div>
    )
  }

  if (!viewer.org) {
    return (
      <PageHeader
        title={`Welcome, ${viewer.user.profile.full_name ?? "there"}`}
        description="You're not part of an organization yet. Ask your Leverage Axiom contact for an invite."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={`Here's where things stand at ${viewer.org.name}.`}
        actions={
          <div className="flex items-center gap-2">
            <Suspense fallback={null}>
              <DepartmentFilterSection
                orgId={viewer.org.id}
                userId={viewer.user.id}
                isOrgAdmin={viewer.isOrgAdmin}
                activeDeptId={deptId}
              />
            </Suspense>
            <Button render={<Link href="/tickets/new" />}>
              <TicketIcon />
              New ticket
            </Button>
          </div>
        }
      />

      <Suspense key={deptId ?? "all"} fallback={<DashboardSkeleton />}>
        <ClientDashboard deptId={deptId} today={today} />
      </Suspense>
    </div>
  )
}
