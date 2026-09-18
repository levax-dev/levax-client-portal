import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed } from "lucide-react"

import type { ScheduleSearchParams } from "@/app/(dashboard)/schedule/page"
import { CompletedTable } from "@/components/work/completed-table"
import { MemberGroups, type MemberGroup } from "@/components/work/member-groups"
import { StatTile } from "@/components/work/stat-tile"
import { ViewTabs } from "@/components/work/view-tabs"
import { WorkTable, type WorkColumn } from "@/components/work/work-table"
import { compareByUrgency } from "@/lib/issue-meta"
import type { Period } from "@/lib/periods"
import {
  buildMemberLoads,
  getCompleted,
  getOpenWork,
  getTeamMembers,
  type WorkItem,
  type WorkScope,
} from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

const CLIENT_COLUMNS: WorkColumn[] = ["category", "project", "department", "status", "due"]
const STAFF_COLUMNS: WorkColumn[] = [
  "category",
  "org",
  "project",
  "status",
  "priority",
  "start",
  "due",
  "estimate",
]
const MEMBER_COLUMNS: WorkColumn[] = ["category", "org", "project", "status", "priority", "due", "estimate"]

export async function ScheduleSection({
  params,
  period,
  today,
}: {
  params: ScheduleSearchParams
  period: Period
  today: string
}) {
  const viewer = await getViewer()
  const supabase = await createClient()

  // Leads can flip the whole page between their own queue and their boards'.
  const teamView = viewer.isProjectLead && params.scope === "team"
  const scope: WorkScope = teamView
    ? { projectIds: viewer.ledProjectIds }
    : viewer.isStaff
      ? { assigneeId: viewer.user.id }
      : { orgId: viewer.org?.id ?? null }

  // One query for everything still open: every bucket below is a slice of it,
  // so switching tabs doesn't cost another round trip.
  const [open, completed] = await Promise.all([
    getOpenWork(supabase, scope),
    getCompleted(supabase, scope, period.from, period.to),
  ])

  const inPeriod = open
    .filter((i) => i.dueDate && i.dueDate >= period.from && i.dueDate <= period.to)
    .sort(compareByUrgency)
  const overdue = open.filter((i) => i.dueDate && i.dueDate < today).sort(compareByUrgency)
  const unscheduled = open.filter((i) => !i.dueDate).sort(compareByUrgency)

  const tab = pickTab(params.tab, viewer.isStaff)
  const columns = viewer.isStaff ? STAFF_COLUMNS : CLIENT_COLUMNS

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Landing ${period.key === "today" ? "today" : "in this period"}`}
          value={inPeriod.length}
          hint={period.label}
          icon={CalendarClock}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          hint={overdue.length > 0 ? "Past the agreed delivery date" : "Nothing has slipped"}
          icon={AlertTriangle}
          tone={overdue.length > 0 ? "critical" : "good"}
        />
        {viewer.isStaff ? (
          <StatTile
            label="No delivery date"
            value={unscheduled.length}
            hint={unscheduled.length > 0 ? "Needs a timeline" : "Everything is scheduled"}
            icon={CircleDashed}
            tone={unscheduled.length > 0 ? "warning" : "good"}
          />
        ) : (
          <StatTile
            label="Open work"
            value={open.length}
            hint="Across your approved projects"
            icon={CircleDashed}
          />
        )}
        <StatTile
          label="Delivered"
          value={completed.length}
          hint={period.label}
          icon={CheckCircle2}
          tone="good"
        />
      </div>

      {viewer.isProjectLead && (
        <ViewTabs
          paramName="scope"
          active={teamView ? "team" : "mine"}
          params={params as Record<string, string | undefined>}
          tabs={[
            { key: "mine", label: "My work" },
            { key: "team", label: "My team" },
          ]}
        />
      )}

      <ViewTabs
        active={tab}
        params={params as Record<string, string | undefined>}
        tabs={[
          { key: "due", label: periodTabLabel(period), count: inPeriod.length },
          { key: "overdue", label: "Overdue", count: overdue.length, alert: true },
          ...(viewer.isStaff
            ? [{ key: "unscheduled", label: "No date set", count: unscheduled.length }]
            : []),
          { key: "delivered", label: "Delivered", count: completed.length },
        ]}
      />

      {tab === "delivered" ? (
        <CompletedTable
          items={completed}
          today={today}
          showOrg={viewer.isStaff && !viewer.org}
          showOwner={viewer.isStaff}
          emptyMessage={`Nothing was closed between ${period.from} and ${period.to}.`}
        />
      ) : teamView ? (
        <TeamGrouped
          items={bucketFor(tab, { inPeriod, overdue, unscheduled })}
          open={open}
          completed={completed}
          projectIds={viewer.ledProjectIds}
          period={period}
          today={today}
        />
      ) : (
        <WorkTable
          items={bucketFor(tab, { inPeriod, overdue, unscheduled })}
          today={today}
          columns={columns}
          showTotals={viewer.isStaff}
          emptyTitle={emptyTitleFor(tab)}
          emptyMessage={emptyMessageFor(tab, viewer.isStaff, period)}
        />
      )}
    </div>
  )
}

/** Groups the active bucket by owner, with each person's load in the header. */
async function TeamGrouped({
  items,
  open,
  completed,
  projectIds,
  period,
  today,
}: {
  items: WorkItem[]
  open: WorkItem[]
  completed: WorkItem[]
  projectIds: string[]
  period: Period
  today: string
}) {
  const supabase = await createClient()
  const members = await getTeamMembers(supabase, projectIds)
  const loads = buildMemberLoads({
    people: members,
    open,
    completed,
    today,
    periodFrom: period.from,
    periodTo: period.to,
  })

  const groups: MemberGroup[] = loads
    .map((load) => ({ load, items: items.filter((i) => i.assignee?.id === load.person.id) }))
    .filter((group) => group.items.length > 0)

  const unassigned = items.filter((i) => !i.assignee)

  return (
    <div className="space-y-4">
      {unassigned.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Unassigned
            <span className="ml-2 text-muted-foreground">
              — {unassigned.length} waiting on an owner
            </span>
          </h3>
          <WorkTable items={unassigned} today={today} columns={MEMBER_COLUMNS} />
        </div>
      )}
      <MemberGroups groups={groups} today={today} columns={MEMBER_COLUMNS} />
    </div>
  )
}

function pickTab(tab: string | undefined, isStaff: boolean): string {
  const allowed = isStaff
    ? ["due", "overdue", "unscheduled", "delivered"]
    : ["due", "overdue", "delivered"]
  return tab && allowed.includes(tab) ? tab : "due"
}

function bucketFor(
  tab: string,
  buckets: { inPeriod: WorkItem[]; overdue: WorkItem[]; unscheduled: WorkItem[] }
): WorkItem[] {
  if (tab === "overdue") return buckets.overdue
  if (tab === "unscheduled") return buckets.unscheduled
  return buckets.inPeriod
}

function periodTabLabel(period: Period): string {
  if (period.key === "today") return "Due today"
  if (period.key === "week") return "This week"
  if (period.key === "month") return "This month"
  return "In range"
}

function emptyTitleFor(tab: string): string {
  if (tab === "overdue") return "Nothing is overdue"
  if (tab === "unscheduled") return "Everything has a delivery date"
  return "Nothing scheduled"
}

function emptyMessageFor(tab: string, isStaff: boolean, period: Period): string {
  if (tab === "overdue") return "Every open item is still inside its agreed date."
  if (tab === "unscheduled") {
    return "Every open task has a delivery date. New tasks land here until one is set."
  }
  return isStaff
    ? `Nothing of yours is due between ${period.from} and ${period.to}.`
    : `Nothing is scheduled to land between ${period.from} and ${period.to}.`
}
