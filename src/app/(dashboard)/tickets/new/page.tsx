import type { Metadata } from "next"

import { NewTicketForm } from "@/components/tickets/new-ticket-form"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "New ticket" }

export default function NewTicketPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title="Raise a ticket" description="Tell us what's going on and we'll take it from here." />
      <Card>
        <CardContent className="pt-6">
          <NewTicketForm />
        </CardContent>
      </Card>
    </div>
  )
}
