import { CheckCircle2, Clock, Ticket, Users } from "lucide-react"

import type { WorkLogSearchParams } from "@/app/(dashboard)/work-log/page"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CompletedTable } from "@/components/work/completed-table"
import { StatTile } from "@/components/work/stat-tile"
import { PersonCell } from "@/components/work/work-table"
import { ViewTabs } from "@/components/work/view-tabs"
import { formatHours } from "@/lib/issue-meta"
import { daysBetween, type Period } from "@/lib/periods"
import { getCompleted, type WorkItem, type WorkScope } from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export async function WorkLogSection({
  params,
  period,
  today,
}: {
  params: WorkLogSearchParams
  period: Period
  today: string
}) {
  const viewer = await getViewer()
  const supabase = await createClient()

  const scopeKey = pickScope(params.scope, viewer.isStaff, viewer.isProjectLead)
  const scope: WorkScope =
    scopeKey === "mine"
      ? { assigneeId: viewer.user.id }
      : scopeKey === "team"
        ? { projectIds: viewer.ledProjectIds }
        : { orgId: viewer.org?.id ?? null }

  const completed = await getCompleted(supabase, scope, period.from, period.to)

  const tickets = completed.filter((i) => i.type === "ticket").length
  const hours = completed.reduce((sum, i) => sum + Number(i.estimatedHours ?? 0), 0)
  const contributors = new Set(
    completed.map((i) => i.assignee?.id).filter((id): id is string => !!id)
  ).size
  const days = Math.max(1, daysBetween(period.from, period.to) + 1)
  const perDay = (completed.length / days).toFixed(completed.length >= days ? 1 : 2)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Items delivered"
          value={completed.length}
          hint={`${period.label} · ${perDay}/day`}
          icon={CheckCircle2}
          tone={completed.length > 0 ? "good" : "default"}
        />
        <StatTile
          label="Tickets closed"
          value={tickets}
          hint="Client requests seen through to the end"
          icon={Ticket}
        />
        <StatTile
          label="Estimated effort"
          value={formatHours(hours)}
          hint="Summed over delivered items"
          icon={Clock}
        />
        <StatTile
          label="Contributors"
          value={contributors}
          hint={contributors === 1 ? "person delivered in this period" : "people delivered in this period"}
          icon={Users}
        />
      </div>

      {viewer.isStaff && (
        <ViewTabs
          paramName="scope"
          active={scopeKey}
          params={params as Record<string, string | undefined>}
          tabs={[
            { key: "mine", label: "My work" },
            ...(viewer.isProjectLead ? [{ key: "team", label: "My team" }] : []),
            { key: "org", label: viewer.org?.name ?? "This client" },
          ]}
        />
      )}

      {(scopeKey === "team" || (viewer.isStaff && scopeKey === "org")) && completed.length > 0 && (
        <ContributionSummary items={completed} />
      )}

      <CompletedTable
        items={completed}
        today={today}
        showOrg={viewer.isStaff && scopeKey !== "org"}
        showOwner={viewer.isStaff}
        emptyMessage={`Nothing was closed between ${period.from} and ${period.to}. Widen the range to look further back.`}
      />
    </div>
  )
}

/** Who delivered what in the period — the roll-up above the item-by-item list. */
function ContributionSummary({ items }: { items: WorkItem[] }) {
  const byPerson = new Map<string, { person: WorkItem["assignee"]; count: number; hours: number }>()

  for (const item of items) {
    const key = item.assignee?.id ?? "unassigned"
    const entry = byPerson.get(key) ?? { person: item.assignee, count: 0, hours: 0 }
    entry.count++
    entry.hours += Number(item.estimatedHours ?? 0)
    byPerson.set(key, entry)
  }

  const rows = Array.from(byPerson.values()).sort((a, b) => b.count - a.count)
  const total = items.length

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Who delivered</CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Effort</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.person?.id ?? `unassigned-${index}`}>
              <TableCell className="py-2.5">
                <PersonCell person={row.person} />
              </TableCell>
              <TableCell className="py-2.5 text-right tabular-nums">{row.count}</TableCell>
              <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                {formatHours(row.hours)}
              </TableCell>
              <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                {Math.round((row.count / total) * 100)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function pickScope(scope: string | undefined, isStaff: boolean, isLead: boolean): string {
  if (!isStaff) return "org"
  const allowed = isLead ? ["mine", "team", "org"] : ["mine", "org"]
  return scope && allowed.includes(scope) ? scope : "mine"
}
