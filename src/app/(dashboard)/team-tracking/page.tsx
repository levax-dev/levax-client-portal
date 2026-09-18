import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { TeamTrackingSection } from "@/components/team-tracking/team-tracking-section"
import { PeriodToggle } from "@/components/work/period-toggle"
import { resolvePeriod, todayISO } from "@/lib/periods"
import { getViewer } from "@/lib/roles"

export const metadata: Metadata = { title: "Team tracking" }

export interface TeamTrackingSearchParams {
  period?: string
  from?: string
  to?: string
}

export default async function TeamTrackingPage({
  searchParams,
}: {
  searchParams: Promise<TeamTrackingSearchParams>
}) {
  const params = await searchParams
  const viewer = await getViewer()

  // Leading a project is what makes someone a lead — no boards, no team.
  if (!viewer.isProjectLead) redirect("/dashboard")

  const today = todayISO()
  const period = resolvePeriod(params.period ?? "week", params.from, params.to, today)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team tracking"
        description="How the people on your projects are tracking — load, progress and what they've closed."
        actions={<PeriodToggle active={period.key} from={period.from} to={period.to} />}
      />

      <Suspense key={JSON.stringify(params)} fallback={<LoadingSpinner minHeight="18rem" />}>
        <TeamTrackingSection period={period} today={today} />
      </Suspense>
    </div>
  )
}
