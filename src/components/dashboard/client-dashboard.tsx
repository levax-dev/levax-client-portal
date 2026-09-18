import Link from "next/link"
import {
  ArrowRight,
  Book,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  KanbanSquare,
  Ticket as TicketIcon,
  TriangleAlert,
} from "lucide-react"

import { ApprovalQueue } from "@/components/projects/approval-queue"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatTile } from "@/components/work/stat-tile"
import { WorkTable } from "@/components/work/work-table"
import { compareByUrgency } from "@/lib/issue-meta"
import { startOfMonth, startOfWeek, addDays } from "@/lib/periods"
import { getCompleted, getOpenWork, getProjectsAwaitingDecision } from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

/**
 * What a client sees on logging in, in the order they asked for it: what needs
 * their sign-off, then what is landing today, then what has slipped.
 */
export async function ClientDashboard({ deptId, today }: { deptId?: string; today: string }) {
  const viewer = await getViewer()
  const supabase = await createClient()
  const orgId = viewer.org?.id ?? null

  const weekStart = startOfWeek(today)
  const weekEnd = addDays(weekStart, 6)

  const [awaiting, open, deliveredThisMonth] = await Promise.all([
    getProjectsAwaitingDecision(supabase, orgId, ["pending", "rejected"]),
    getOpenWork(supabase, { orgId }),
    getCompleted(supabase, { orgId }, startOfMonth(today), today),
  ])

  // The department filter narrows the work views but never the approval queue —
  // a project awaiting sign-off shouldn't be filterable out of sight.
  const scopedOpen = deptId ? open.filter((i) => i.departmentId === deptId) : open

  const dueToday = scopedOpen.filter((i) => i.dueDate === today).sort(compareByUrgency)
  const thisWeek = scopedOpen
    .filter((i) => i.dueDate && i.dueDate >= weekStart && i.dueDate <= weekEnd)
    .sort(compareByUrgency)
  const overdue = scopedOpen.filter((i) => i.dueDate && i.dueDate < today).sort(compareByUrgency)
  const openTickets = scopedOpen.filter((i) => i.type === "ticket").length
  const pending = awaiting.filter((p) => p.approvalStatus === "pending")

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Awaiting your approval"
          value={pending.length}
          hint={pending.length > 0 ? "Work can't start until you decide" : "Nothing needs a decision"}
          icon={ClipboardCheck}
          tone={pending.length > 0 ? "warning" : "default"}
          href="/projects"
        />
        <StatTile
          label="Landing today"
          value={dueToday.length}
          hint={`${thisWeek.length} due this week`}
          icon={CalendarClock}
          href="/schedule"
        />
        <StatTile
          label="Past due"
          value={overdue.length}
          hint={overdue.length > 0 ? "Behind the agreed date" : "Everything is on schedule"}
          icon={TriangleAlert}
          tone={overdue.length > 0 ? "critical" : "good"}
          href="/schedule?tab=overdue"
        />
        <StatTile
          label="Delivered this month"
          value={deliveredThisMonth.length}
          hint={`${openTickets} tickets still open`}
          icon={CheckCircle2}
          tone="good"
          href="/work-log?period=month"
        />
      </div>

      {pending.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Waiting on your approval</h2>
              <p className="text-sm text-muted-foreground">
                Nothing is worked on until you approve it.
              </p>
            </div>
          </div>
          <ApprovalQueue projects={pending} canDecide />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {dueToday.length > 0 ? "Expected to close today" : "Coming up this week"}
          </h2>
          <Button variant="ghost" size="sm" render={<Link href="/schedule" />}>
            Full schedule
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <WorkTable
          items={(dueToday.length > 0 ? dueToday : thisWeek).slice(0, 10)}
          today={today}
          columns={["category", "project", "department", "status", "due"]}
          emptyTitle="Nothing scheduled this week"
          emptyMessage="Once the team schedules work on your approved projects, the delivery dates show up here."
        />
      </section>

      {overdue.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Running late</h2>
          <WorkTable
            items={overdue.slice(0, 5)}
            today={today}
            columns={["category", "project", "status", "due"]}
          />
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 sm:grid-cols-2">
          <QuickLink href="/tickets/new" icon={TicketIcon} label="Raise a ticket" />
          <QuickLink href="/work-log" icon={CheckCircle2} label="Review work delivered" />
          <QuickLink href="/projects" icon={KanbanSquare} label="Projects and boards" />
          <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
        </CardContent>
      </Card>
    </div>
  )
}

export function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: typeof TicketIcon
  label: string
}) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  )
}
