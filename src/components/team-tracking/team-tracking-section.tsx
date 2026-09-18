import Link from "next/link"
import { AlertTriangle, CheckCircle2, KanbanSquare, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CapacityMeter, RateMeter } from "@/components/work/capacity-meter"
import { StatTile } from "@/components/work/stat-tile"
import { StatusPill } from "@/components/work/status-pill"
import { PersonCell } from "@/components/work/work-table"
import { formatHours } from "@/lib/issue-meta"
import type { Period } from "@/lib/periods"
import {
  buildMemberLoads,
  getCompleted,
  getOpenWork,
  getTeamMembers,
  type WorkItem,
} from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export async function TeamTrackingSection({ period, today }: { period: Period; today: string }) {
  const viewer = await getViewer()
  const supabase = await createClient()
  const scope = { projectIds: viewer.ledProjectIds }

  const [open, completed, members, { data: projects }] = await Promise.all([
    getOpenWork(supabase, scope),
    getCompleted(supabase, scope, period.from, period.to),
    getTeamMembers(supabase, viewer.ledProjectIds),
    supabase
      .from("projects")
      .select("id, name, organizations(name)")
      .in("id", viewer.ledProjectIds)
      .order("name"),
  ])

  const loads = buildMemberLoads({
    people: members,
    open,
    completed,
    today,
    periodFrom: period.from,
    periodTo: period.to,
  })

  const overdue = open.filter((i) => i.dueDate && i.dueDate < today).length
  const touched = open.length + completed.length
  const teamRate = touched === 0 ? 0 : Math.round((completed.length / touched) * 100)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="People on your boards"
          value={members.length}
          hint={`Across ${viewer.ledProjectIds.length} ${viewer.ledProjectIds.length === 1 ? "project" : "projects"}`}
          icon={Users}
        />
        <StatTile
          label="Open work"
          value={open.length}
          hint={`${open.filter((i) => !i.dueDate).length} with no delivery date`}
          icon={KanbanSquare}
        />
        <StatTile
          label="Overdue"
          value={overdue}
          hint={overdue > 0 ? "Needs a conversation today" : "Nothing has slipped"}
          icon={AlertTriangle}
          tone={overdue > 0 ? "critical" : "good"}
        />
        <StatTile
          label="Delivered"
          value={completed.length}
          hint={`${period.label} · ${teamRate}% completion rate`}
          icon={CheckCircle2}
          tone="good"
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="text-sm">
            Per person
            <span className="ml-2 font-normal text-muted-foreground">{period.label}</span>
          </CardTitle>
        </CardHeader>
        {loads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nobody is assigned yet"
            description="Assign tasks on your project boards and each person's progress shows up here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-44">Person</TableHead>
                <TableHead>Exposure</TableHead>
                <TableHead className="min-w-44">Planned vs capacity</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="min-w-36">Completion rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loads.map((load) => (
                <TableRow key={load.person.id}>
                  <TableCell className="py-3">
                    <PersonCell person={load.person} />
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {load.overdue > 0 && (
                        <StatusPill state="overdue" label={`${load.overdue} overdue`} />
                      )}
                      {load.dueToday > 0 && (
                        <StatusPill state="today" label={`${load.dueToday} today`} />
                      )}
                      {load.unscheduled > 0 && (
                        <StatusPill state="unscheduled" label={`${load.unscheduled} undated`} />
                      )}
                      {load.overdue === 0 && load.dueToday === 0 && load.unscheduled === 0 && (
                        <StatusPill state="ontrack" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <CapacityMeter
                      planned={Math.round(load.hoursThisPeriod * 10) / 10}
                      capacity={load.weeklyCapacityHours}
                    />
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums">{load.open}</TableCell>
                  <TableCell className="py-3 text-right tabular-nums">
                    {load.completedThisPeriod}
                  </TableCell>
                  <TableCell className="py-3">
                    <RateMeter percent={load.completionRate} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ProjectBreakdown
        projects={projects ?? []}
        open={open}
        completed={completed}
        today={today}
      />
    </div>
  )
}

function ProjectBreakdown({
  projects,
  open,
  completed,
  today,
}: {
  projects: { id: string; name: string; organizations: unknown }[]
  open: WorkItem[]
  completed: WorkItem[]
  today: string
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">Per project</CardTitle>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Open</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead className="text-right">Undated</TableHead>
            <TableHead className="text-right">Delivered</TableHead>
            <TableHead className="text-right">Effort planned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const projectOpen = open.filter((i) => i.projectId === project.id)
            const org = project.organizations as { name: string } | null
            return (
              <TableRow key={project.id}>
                <TableCell className="py-2.5 font-medium">
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell className="py-2.5 text-sm text-muted-foreground">
                  {org?.name ?? "—"}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums">
                  {projectOpen.length}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums">
                  {projectOpen.filter((i) => i.dueDate && i.dueDate < today).length}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums">
                  {projectOpen.filter((i) => !i.dueDate).length}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums">
                  {completed.filter((i) => i.projectId === project.id).length}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatHours(
                    projectOpen.reduce((sum, i) => sum + Number(i.estimatedHours ?? 0), 0)
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
