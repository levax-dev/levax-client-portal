import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { TicketsListSection } from "@/components/tickets/tickets-list-section"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Tickets" }

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgParam } = await searchParams

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Support requests raised by your organization."
        actions={
          <Button render={<Link href="/tickets/new" />}>
            <Plus />
            New ticket
          </Button>
        }
      />
      <Suspense fallback={<LoadingSpinner />}>
        <TicketsListSection orgParam={orgParam} />
      </Suspense>
    </div>
  )
}
