import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PersonCell } from "@/components/work/work-table"
import { categoryColor, categoryLabel, formatHours } from "@/lib/issue-meta"
import { formatDateShort, instantToDate } from "@/lib/periods"
import type { WorkItem } from "@/lib/queries/work"

function completedOn(item: WorkItem, today: string): string {
  if (!item.resolvedAt) return "—"
  return formatDateShort(instantToDate(item.resolvedAt), today)
}

/**
 * What actually got delivered in a period, and what that delivery was.
 *
 * The resolution note is the point of this table, not a detail — it's the
 * sentence the client reads back at the end of a week to understand what they
 * paid for. Rows without one say so plainly rather than rendering a blank.
 */
export function CompletedTable({
  items,
  today,
  showOrg = false,
  showOwner = true,
  emptyMessage,
}: {
  items: WorkItem[]
  today: string
  showOrg?: boolean
  showOwner?: boolean
  emptyMessage?: string
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing closed in this period"
        description={emptyMessage ?? "Try widening the date range."}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-72">Delivered</TableHead>
            <TableHead>Type</TableHead>
            {showOrg && <TableHead>Client</TableHead>}
            <TableHead>Project</TableHead>
            {showOwner && <TableHead>By</TableHead>}
            <TableHead className="text-right">Effort</TableHead>
            <TableHead className="text-right">Closed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-120 py-3 align-top whitespace-normal">
                <Link href={`/tickets/${item.id}`} className="font-medium hover:underline">
                  {item.title}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.resolutionNote ?? (
                    <span className="italic">Closed without a summary of the work.</span>
                  )}
                </p>
              </TableCell>
              <TableCell className="py-3 align-top">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: categoryColor(item.category) }}
                    aria-hidden
                  />
                  <span className="text-sm whitespace-nowrap">{categoryLabel(item.category)}</span>
                </div>
              </TableCell>
              {showOrg && (
                <TableCell className="py-3 align-top text-sm">{item.orgName ?? "—"}</TableCell>
              )}
              <TableCell className="py-3 align-top">
                <Link
                  href={`/projects/${item.projectId}`}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {item.projectName ?? "—"}
                </Link>
              </TableCell>
              {showOwner && (
                <TableCell className="py-3 align-top">
                  <PersonCell person={item.assignee} />
                </TableCell>
              )}
              <TableCell className="py-3 text-right align-top text-sm tabular-nums text-muted-foreground">
                {formatHours(item.estimatedHours)}
              </TableCell>
              <TableCell className="py-3 text-right align-top text-sm whitespace-nowrap tabular-nums text-muted-foreground">
                {completedOn(item, today)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
