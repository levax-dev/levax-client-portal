"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export interface OrgBreakdownRow {
  orgId: string
  orgName: string
  openTickets: number
  resolvedTickets: number
  totalTickets: number
}

export function OrgBreakdown({ rows }: { rows: OrgBreakdownRow[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} className="gap-1.5">
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        {open ? "Hide" : "Show"} breakdown by organization
      </Button>

      {open && (
        <div className="mt-3 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.orgId}>
                  <TableCell className="font-medium">
                    <Link href={`/tickets?org=${row.orgId}`} className="hover:underline">
                      {row.orgName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{row.openTickets}</TableCell>
                  <TableCell className="text-right">{row.resolvedTickets}</TableCell>
                  <TableCell className="text-right">{row.totalTickets}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    No organizations yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
