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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { IssuePriority } from "@/types/database"

export interface TicketRow {
  id: string
  title: string
  priority: IssuePriority
  created_at: string
  column: { name: string; color: string } | null
  assignee: { full_name: string | null; avatar_url: string | null } | null
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

export function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  const [query, setQuery] = useState("")
  const [priority, setPriority] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")

  const statuses = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.column?.name).filter(Boolean))) as string[],
    [tickets]
  )

  const filtered = tickets.filter((t) => {
    if (query && !t.title.toLowerCase().includes(query.toLowerCase())) return false
    if (priority !== "all" && t.priority !== priority) return false
    if (status !== "all" && t.column?.name !== status) return false
    return true
  })

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="No tickets yet"
        description="Raise a ticket and it will show up here."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value ?? "all")}>
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
        <Select value={priority} onValueChange={(value) => setPriority(value ?? "all")}>
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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((ticket) => (
              <TableRow key={ticket.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                    {ticket.title}
                  </Link>
                </TableCell>
                <TableCell>
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
                <TableCell>
                  <PriorityBadge priority={ticket.priority} />
                </TableCell>
                <TableCell>
                  {ticket.assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        {ticket.assignee.avatar_url && <AvatarImage src={ticket.assignee.avatar_url} />}
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
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No tickets match your filters.</p>
        )}
      </div>
    </div>
  )
}
