import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { TicketsTable, type TicketRow } from "@/components/tickets/tickets-table"
import { Button } from "@/components/ui/button"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Tickets" }

export default async function TicketsPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)
  const supabase = await createClient()

  const { data } = org
    ? await supabase
        .from("issues")
        .select(
          "id, title, priority, created_at, board_columns(name, color), profiles!issues_assignee_id_fkey(full_name, avatar_url)"
        )
        .eq("org_id", org.id)
        .eq("type", "ticket")
        .order("created_at", { ascending: false })
    : { data: [] }

  const tickets: TicketRow[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    created_at: row.created_at,
    column: (row.board_columns as unknown as TicketRow["column"]) ?? null,
    assignee: (row.profiles as unknown as TicketRow["assignee"]) ?? null,
  }))

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
      <TicketsTable tickets={tickets} />
    </div>
  )
}
