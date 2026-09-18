"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Search, Ticket } from "lucide-react"

import { PriorityBadge } from "@/components/priority-badge"
import { EmptyState } from "@/components/empty-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TICKET_CATEGORIES, categoryColor, categoryLabel } from "@/lib/issue-meta"
import type { IssuePriority, TicketCategory } from "@/types/database"

export interface TicketRow {
  id: string
  title: string
  priority: IssuePriority
  category: TicketCategory | null
  created_at: string
  resolvedAt: string | null
  dueDate: string | null
  reporterId: string | null
  projectId: string
  department: string | null
  column: { name: string; color: string } | null
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null
  /** Tasks raised off this ticket, and how many have landed. */
  tasks: { total: number; done: number }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function TicketFilterTable({
  tickets,
  emptyMessage,
  isStaff,
}: {
  tickets: TicketRow[]
  emptyMessage: string
  isStaff: boolean
}) {
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [department, setDepartment] = useState<string>("all")
  const [category, setCategory] = useState<string>("all")

  const statuses = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.column?.name).filter(Boolean))) as string[],
    [tickets]
  )
  const departments = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.department).filter(Boolean))) as string[],
    [tickets]
  )

  const filtered = tickets.filter((t) => {
    if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false
    if (priority !== "all" && t.priority !== priority) return false
    if (status !== "all" && t.column?.name !== status) return false
    if (department !== "all" && t.department !== department) return false
    if (category !== "all" && t.category !== category) return false
    return true
  })

  if (tickets.length === 0) {
    return <EmptyState icon={Ticket} title="No tickets" description={emptyMessage} />
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          items={{
            all: "All request types",
            ...Object.fromEntries(TICKET_CATEGORIES.map((c) => [c.value, c.label])),
          }}
          value={category}
          onValueChange={(value) => setCategory(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Request type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All request types</SelectItem>
            {TICKET_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={{ all: "All statuses", ...Object.fromEntries(statuses.map((s) => [s, s])) }}
          value={status}
          onValueChange={(value) => setStatus(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {departments.length > 1 && (
          <Select
            items={{ all: "All departments", ...Object.fromEntries(departments.map((d) => [d, d])) }}
            value={department}
            onValueChange={(value) => setDepartment(value ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          items={{
            all: "All priorities",
            urgent: "Urgent",
            high: "High",
            medium: "Medium",
            low: "Low",
          }}
          value={priority}
          onValueChange={(value) => setPriority(value ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="min-w-56">Ticket</TableHead>
              <TableHead>Request type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Work planned</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Priority</TableHead>
              {isStaff && <TableHead>Owner</TableHead>}
              <TableHead className="text-right">Raised</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="max-w-96 py-2.5 font-medium">
                  <Link href={`/tickets/${ticket.id}`} className="block truncate hover:underline">
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(ticket.category) }}
                      aria-hidden
                    />
                    <span className="text-sm whitespace-nowrap">
                      {categoryLabel(ticket.category)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5">
                  {ticket.column && (
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: `color-mix(in oklch, ${ticket.column.color} 15%, transparent)`,
                        color: ticket.column.color,
                      }}
                    >
                      {ticket.column.name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="py-2.5">
                  {ticket.tasks.total === 0 ? (
                    <span className="text-sm text-muted-foreground">Not scheduled</span>
                  ) : (
                    <span className="text-sm tabular-nums">
                      {ticket.tasks.done}/{ticket.tasks.total} tasks done
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-sm text-muted-foreground">
                  {ticket.department ?? "—"}
                </TableCell>
                <TableCell className="py-2.5">
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                {isStaff && (
                  <TableCell className="py-2.5">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          {ticket.assignee.avatar_url && (
                            <AvatarImage src={ticket.assignee.avatar_url} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {initials(ticket.assignee.full_name ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ticket.assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="py-2.5 text-right text-sm whitespace-nowrap text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No tickets match your filters.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {tickets.length} tickets.
      </p>
    </div>
  )
}

export function TicketsTable({
  tickets,
  currentUserId,
  leadProjectIds = [],
  isStaff,
}: {
  tickets: TicketRow[]
  currentUserId: string
  leadProjectIds?: string[]
  isStaff: boolean
}) {
  const myTickets = useMemo(
    () => tickets.filter((t) => t.assignee?.id === currentUserId || t.reporterId === currentUserId),
    [tickets, currentUserId]
  )
  const isProjectLead = leadProjectIds.length > 0

  // What a lead is actually looking for: raised, but nothing planned against it.
  const needsTriage = useMemo(
    () => tickets.filter((t) => t.tasks.total === 0 && !t.resolvedAt),
    [tickets]
  )

  return (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All tickets ({tickets.length})</TabsTrigger>
        <TabsTrigger value="mine">My tickets ({myTickets.length})</TabsTrigger>
        {isProjectLead && (
          <TabsTrigger value="triage">Awaiting triage ({needsTriage.length})</TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="all" className="mt-3">
        <TicketFilterTable
          tickets={tickets}
          isStaff={isStaff}
          emptyMessage="Raise a ticket and it will show up here."
        />
      </TabsContent>
      <TabsContent value="mine" className="mt-3">
        <TicketFilterTable
          tickets={myTickets}
          isStaff={isStaff}
          emptyMessage="Tickets assigned to you or raised by you will show up here."
        />
      </TabsContent>
      {isProjectLead && (
        <TabsContent value="triage" className="mt-3">
          <TicketFilterTable
            tickets={needsTriage}
            isStaff={isStaff}
            emptyMessage="Every open ticket has work planned against it."
          />
        </TabsContent>
      )}
    </Tabs>
  )
}
