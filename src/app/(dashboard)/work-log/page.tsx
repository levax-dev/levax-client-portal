import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { WorkLogSection } from "@/components/work-log/work-log-section"
import { PeriodToggle } from "@/components/work/period-toggle"
import { resolvePeriod, todayISO } from "@/lib/periods"
import { getViewer } from "@/lib/roles"

export const metadata: Metadata = { title: "Work log" }

export interface WorkLogSearchParams {
  period?: string
  from?: string
  to?: string
  scope?: string
}

export default async function WorkLogPage({
  searchParams,
}: {
  searchParams: Promise<WorkLogSearchParams>
}) {
  const params = await searchParams
  const viewer = await getViewer()
  const today = todayISO()

  // The work log is a look-back, so it opens on the week rather than on today.
  const period = resolvePeriod(params.period ?? "week", params.from, params.to, today)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work log"
        description={
          viewer.isStaff
            ? "Everything closed in a period, with what was actually done."
            : `Everything delivered for ${viewer.org?.name ?? "your organization"}, with a note on each.`
        }
        actions={<PeriodToggle active={period.key} from={period.from} to={period.to} />}
      />

      <Suspense key={JSON.stringify(params)} fallback={<LoadingSpinner minHeight="18rem" />}>
        <WorkLogSection params={params} period={period} today={today} />
      </Suspense>
    </div>
  )
}
