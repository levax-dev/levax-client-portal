import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { ScheduleSection } from "@/components/schedule/schedule-section"
import { PeriodToggle } from "@/components/work/period-toggle"
import { getViewer } from "@/lib/roles"
import { resolvePeriod, todayISO } from "@/lib/periods"

export const metadata: Metadata = { title: "Schedule" }

export interface ScheduleSearchParams {
  period?: string
  from?: string
  to?: string
  tab?: string
  scope?: string
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<ScheduleSearchParams>
}) {
  const params = await searchParams
  const viewer = await getViewer()
  const today = todayISO()
  const period = resolvePeriod(params.period, params.from, params.to, today)

  return (
    <div className="space-y-6">
      <PageHeader
        title={viewer.isStaff ? "Schedule" : "Delivery schedule"}
        description={
          viewer.isStaff
            ? "What you owe, what's slipping, and what still has no date on it."
            : "What your approved projects are on track to deliver, and when."
        }
        actions={<PeriodToggle active={period.key} from={period.from} to={period.to} />}
      />

      <Suspense key={JSON.stringify(params)} fallback={<LoadingSpinner minHeight="18rem" />}>
        <ScheduleSection params={params} period={period} today={today} />
      </Suspense>
    </div>
  )
}
