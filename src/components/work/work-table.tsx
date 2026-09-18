import Link from "next/link"
import { CornerDownRight, Inbox } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PriorityBadge } from "@/components/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DueCell } from "@/components/work/status-pill"
import { categoryColor, categoryLabel, formatHours } from "@/lib/issue-meta"
import { formatDateShort } from "@/lib/periods"
import type { WorkItem } from "@/lib/queries/work"

export type WorkColumn =
  | "category"
  | "org"
  | "project"
  | "department"
  | "status"
  | "assignee"
  | "priority"
  | "start"
  | "due"
  | "estimate"

const HEADINGS: Record<WorkColumn, string> = {
  category: "Type",
  org: "Client",
  project: "Project",
  department: "Department",
  status: "Stage",
  assignee: "Owner",
  priority: "Priority",
  start: "Starts",
  due: "Delivery",
  estimate: "Est.",
}

/** Numeric columns get tabular figures so they line up down the column. */
const NUMERIC: Partial<Record<WorkColumn, boolean>> = { estimate: true }

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function PersonCell({
  person,
}: {
  person: { full_name: string | null; avatar_url: string | null } | null
}) {
  if (!person) return <span className="text-sm text-muted-foreground">Unassigned</span>
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6">
        {person.avatar_url && <AvatarImage src={person.avatar_url} />}
        <AvatarFallback className="text-[10px]">{initials(person.full_name ?? "?")}</AvatarFallback>
      </Avatar>
      <span className="truncate text-sm">{person.full_name ?? "Unnamed"}</span>
    </div>
  )
}

function CategoryCell({ item }: { item: WorkItem }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: categoryColor(item.category) }}
        aria-hidden
      />
      <span className="text-sm whitespace-nowrap">{categoryLabel(item.category)}</span>
    </div>
  )
}

function Cell({ column, item, today }: { column: WorkColumn; item: WorkItem; today: string }) {
  switch (column) {
    case "category":
      return <CategoryCell item={item} />
    case "org":
      return <span className="text-sm">{item.orgName ?? "—"}</span>
    case "project":
      return (
        <Link
          href={`/projects/${item.projectId}`}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {item.projectName ?? "—"}
        </Link>
      )
    case "department":
      return <span className="text-sm text-muted-foreground">{item.department ?? "—"}</span>
    case "status":
      return item.status ? (
        <Badge
          variant="secondary"
          style={{
            backgroundColor: `color-mix(in oklch, ${item.status.color} 15%, transparent)`,
            color: item.status.color,
          }}
        >
          {item.status.name}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )
    case "assignee":
      return <PersonCell person={item.assignee} />
    case "priority":
      return <PriorityBadge priority={item.priority} />
    case "start":
      return (
        <span className="text-sm text-muted-foreground">
          {item.startDate ? formatDateShort(item.startDate, today) : "—"}
        </span>
      )
    case "due":
      return (
        <div className="flex items-center gap-2">
          {item.dueDate && (
            <span className="text-sm whitespace-nowrap tabular-nums">
              {formatDateShort(item.dueDate, today)}
            </span>
          )}
          <DueCell dueDate={item.dueDate} resolvedAt={item.resolvedAt} today={today} />
        </div>
      )
    case "estimate":
      return (
        <span className="text-sm tabular-nums text-muted-foreground">
          {formatHours(item.estimatedHours)}
        </span>
      )
  }
}

/**
 * The planning table. One row per piece of work, columns chosen by the caller
 * so the same component serves the client's delivery schedule, the team's
 * queue and a lead's per-member breakdown without three near-copies.
 *
 * Rendered on the server: these views are read-then-act, and the period toggle
 * above already drives them through the URL, so there's nothing here that needs
 * to ship as client JavaScript.
 */
export function WorkTable({
  items,
  today,
  columns,
  emptyTitle = "Nothing here",
  emptyMessage,
  showTotals = false,
  bare = false,
}: {
  items: WorkItem[]
  today: string
  columns: WorkColumn[]
  emptyTitle?: string
  emptyMessage?: string
  showTotals?: boolean
  /** Drop the outer border when the table already sits inside a card. */
  bare?: boolean
}) {
  if (items.length === 0) {
    return (
      <div className={bare ? "px-4 py-2" : undefined}>
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyMessage} />
      </div>
    )
  }

  const totalHours = items.reduce((sum, i) => sum + Number(i.estimatedHours ?? 0), 0)
  const showsEstimate = columns.includes("estimate")

  return (
    <div className={bare ? undefined : "overflow-hidden rounded-lg border"}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="min-w-56">Work item</TableHead>
            {columns.map((column) => (
              <TableHead key={column} className={NUMERIC[column] ? "text-right" : undefined}>
                {HEADINGS[column]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="max-w-96 py-2.5">
                <div className="flex items-start gap-1.5">
                  {item.type !== "ticket" && (
                    <CornerDownRight
                      className="mt-1 size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Task raised from a ticket"
                    />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/tickets/${item.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.type === "ticket" && (
                      <span className="text-xs text-muted-foreground">Ticket</span>
                    )}
                  </div>
                </div>
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  className={NUMERIC[column] ? "py-2.5 text-right" : "py-2.5"}
                >
                  <Cell column={column} item={item} today={today} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {showTotals && showsEstimate && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-medium">
                {items.length} {items.length === 1 ? "item" : "items"}
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column} className={NUMERIC[column] ? "text-right" : undefined}>
                  {column === "estimate" ? (
                    <span className="font-medium tabular-nums">{formatHours(totalHours)}</span>
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  )
}
