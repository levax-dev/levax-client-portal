import Link from "next/link"
import {
  ArrowRight,
  Book,
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  KanbanSquare,
  Ticket as TicketIcon,
  TriangleAlert,
  Users,
} from "lucide-react"

import { QuickLink } from "@/components/dashboard/client-dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CapacityMeter } from "@/components/work/capacity-meter"
import { StatTile } from "@/components/work/stat-tile"
import { StatusPill } from "@/components/work/status-pill"
import { PersonCell, WorkTable } from "@/components/work/work-table"
import { compareByUrgency } from "@/lib/issue-meta"
import { addDays, instantToDate, startOfWeek } from "@/lib/periods"
import {
  buildMemberLoads,
  getCompleted,
  getOpenWork,
  getTeamMembers,
} from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

/**
 * The team's own view: their queue first, and — if they lead projects — what
 * their boards and the people on them look like this week.
 */
export async function StaffDashboard({ today }: { today: string }) {
  const viewer = await getViewer()
  const supabase = await createClient()

  const weekStart = startOfWeek(today)
  const weekEnd = addDays(weekStart, 6)

  const [mine, deliveredThisWeek] = await Promise.all([
    getOpenWork(supabase, { assigneeId: viewer.user.id }),
    getCompleted(supabase, { assigneeId: viewer.user.id }, weekStart, weekEnd),
  ])

  const dueToday = mine.filter((i) => i.dueDate === today).sort(compareByUrgency)
  const overdue = mine.filter((i) => i.dueDate && i.dueDate < today).sort(compareByUrgency)
  const unscheduled = mine.filter((i) => !i.dueDate).sort(compareByUrgency)
  const thisWeek = mine
    .filter((i) => i.dueDate && i.dueDate >= weekStart && i.dueDate <= weekEnd)
    .sort(compareByUrgency)
  const plannedHours = thisWeek.reduce((sum, i) => sum + Number(i.estimatedHours ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Due today"
          value={dueToday.length}
          hint={`${thisWeek.length} due this week`}
          icon={CalendarClock}
          href="/schedule"
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          hint={overdue.length > 0 ? "Past the date you committed to" : "Nothing has slipped"}
          icon={TriangleAlert}
          tone={overdue.length > 0 ? "critical" : "good"}
          href="/schedule?tab=overdue"
        />
        <StatTile
          label="No delivery date"
          value={unscheduled.length}
          hint={unscheduled.length > 0 ? "Needs a timeline before it slips" : "All of yours are dated"}
          icon={CircleDashed}
          tone={unscheduled.length > 0 ? "warning" : "good"}
          href="/schedule?tab=unscheduled"
        />
        <StatTile
          label="Delivered this week"
          value={deliveredThisWeek.length}
          hint={`${mine.length} still open`}
          icon={CheckCircle2}
          tone="good"
          href="/work-log"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Your week</CardTitle>
        </CardHeader>
        <CardContent>
          <CapacityMeter
            planned={Math.round(plannedHours * 10) / 10}
            capacity={Number(viewer.user.profile.weekly_capacity_hours ?? 40)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated hours on work due this week, against your weekly capacity.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {overdue.length > 0 ? "Needs attention first" : "On your plate today"}
          </h2>
          <Button variant="ghost" size="sm" render={<Link href="/schedule" />}>
            Full schedule
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
        <WorkTable
          items={[...overdue, ...dueToday].slice(0, 10)}
          today={today}
          columns={["category", "org", "project", "status", "priority", "due", "estimate"]}
          showTotals
          emptyTitle="Nothing due today"
          emptyMessage="Nothing of yours is overdue or due today. Check the week view for what's coming."
        />
      </section>

      {viewer.isProjectLead && <LeadSnapshot today={today} weekStart={weekStart} weekEnd={weekEnd} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 sm:grid-cols-2">
          <QuickLink href="/tickets" icon={TicketIcon} label="Tickets awaiting triage" />
          <QuickLink href="/work-log" icon={CheckCircle2} label="Work log" />
          <QuickLink href="/projects" icon={KanbanSquare} label="Projects and boards" />
          <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
        </CardContent>
      </Card>
    </div>
  )
}

/** For project leads: the state of their boards and the people working them. */
async function LeadSnapshot({
  today,
  weekStart,
  weekEnd,
}: {
  today: string
  weekStart: string
  weekEnd: string
}) {
  const viewer = await getViewer()
  const supabase = await createClient()
  const scope = { projectIds: viewer.ledProjectIds }

  const [teamOpen, teamDone, members, { data: untriaged }] = await Promise.all([
    getOpenWork(supabase, scope),
    getCompleted(supabase, scope, weekStart, weekEnd),
    getTeamMembers(supabase, viewer.ledProjectIds),
    // Tickets on the lead's projects with no work planned against them yet.
    supabase
      .from("issues")
      .select("id, title, created_at, project_id, projects!issues_project_id_fkey(name)")
      .in("project_id", viewer.ledProjectIds)
      .eq("type", "ticket")
      .is("resolved_at", null)
      .order("created_at", { ascending: true }),
  ])

  const { data: plannedChildren } = await supabase
    .from("issues")
    .select("parent_ticket_id")
    .in("project_id", viewer.ledProjectIds)
    .not("parent_ticket_id", "is", null)

  const plannedIds = new Set((plannedChildren ?? []).map((c) => c.parent_ticket_id))
  const needsTriage = (untriaged ?? []).filter((t) => !plannedIds.has(t.id))

  const loads = buildMemberLoads({
    people: members,
    open: teamOpen,
    completed: teamDone,
    today,
    periodFrom: weekStart,
    periodTo: weekEnd,
  })

  const teamOverdue = teamOpen.filter((i) => i.dueDate && i.dueDate < today).length
  const teamUndated = teamOpen.filter((i) => !i.dueDate).length

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Your team this week</h2>
        <Button variant="ghost" size="sm" render={<Link href="/team-tracking" />}>
          Team tracking
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Tickets awaiting triage"
          value={needsTriage.length}
          hint={needsTriage.length > 0 ? "Raised, nothing planned yet" : "Every ticket has work on it"}
          icon={TicketIcon}
          tone={needsTriage.length > 0 ? "warning" : "good"}
          href="/tickets"
        />
        <StatTile
          label="Team overdue"
          value={teamOverdue}
          hint={`${teamUndated} with no date set`}
          icon={TriangleAlert}
          tone={teamOverdue > 0 ? "critical" : "good"}
          href="/schedule?scope=team&tab=overdue"
        />
        <StatTile
          label="People on your boards"
          value={members.length}
          hint={`${teamOpen.length} open items between them`}
          icon={Users}
          href="/team-tracking"
        />
        <StatTile
          label="Team delivered"
          value={teamDone.length}
          hint="This week"
          icon={CheckCircle2}
          tone="good"
          href="/work-log?scope=team"
        />
      </div>

      {needsTriage.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 py-3">
            <CardTitle className="text-sm">Tickets with no work planned</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Raised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {needsTriage.slice(0, 5).map((ticket) => {
                const project = ticket.projects as unknown as { name: string } | null
                return (
                  <TableRow key={ticket.id}>
                    <TableCell className="py-2.5 font-medium">
                      <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 text-sm text-muted-foreground">
                      {project?.name ?? "—"}
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                      {instantToDate(ticket.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {loads.length > 0 && (
        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 py-3">
            <CardTitle className="text-sm">Load per person</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead className="min-w-40">This week vs capacity</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.slice(0, 6).map((load) => (
                <TableRow key={load.person.id}>
                  <TableCell className="py-2.5">
                    <PersonCell person={load.person} />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {load.overdue > 0 && (
                        <StatusPill state="overdue" label={`${load.overdue} overdue`} />
                      )}
                      {load.dueToday > 0 && (
                        <StatusPill state="today" label={`${load.dueToday} today`} />
                      )}
                      {load.overdue === 0 && load.dueToday === 0 && <StatusPill state="ontrack" />}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <CapacityMeter
                      planned={Math.round(load.hoursThisPeriod * 10) / 10}
                      capacity={load.weeklyCapacityHours}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-right tabular-nums">{load.open}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  )
}
