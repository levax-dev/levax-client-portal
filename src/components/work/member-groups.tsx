import { Users } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CapacityMeter } from "@/components/work/capacity-meter"
import { StatusPill } from "@/components/work/status-pill"
import { WorkTable, initials, type WorkColumn } from "@/components/work/work-table"
import type { MemberLoad, WorkItem } from "@/lib/queries/work"

export interface MemberGroup {
  load: MemberLoad
  items: WorkItem[]
}

/**
 * Pending work grouped by the person who owns it — the view a lead opens to
 * decide who needs help today.
 *
 * Each header states the member's exposure in words (overdue / due today /
 * undated) next to their planned hours against capacity, so the decision is
 * readable without opening a single row.
 */
export function MemberGroups({
  groups,
  today,
  columns,
  emptyMessage,
}: {
  groups: MemberGroup[]
  today: string
  columns: WorkColumn[]
  emptyMessage?: string
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No one has work in this view"
        description={
          emptyMessage ??
          "Once tasks on your projects are assigned, each person's queue shows up here."
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {groups.map(({ load, items }) => (
        <Card key={load.person.id} className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                {load.person.avatar_url && <AvatarImage src={load.person.avatar_url} />}
                <AvatarFallback className="text-xs">
                  {initials(load.person.full_name ?? "?")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{load.person.full_name ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? "item" : "items"} in view · {load.open} open
                  overall
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {load.overdue > 0 && (
                <StatusPill state="overdue" label={`${load.overdue} overdue`} />
              )}
              {load.dueToday > 0 && <StatusPill state="today" label={`${load.dueToday} today`} />}
              {load.unscheduled > 0 && (
                <StatusPill state="unscheduled" label={`${load.unscheduled} undated`} />
              )}
              <CapacityMeter
                planned={Math.round(load.hoursThisPeriod * 10) / 10}
                capacity={load.weeklyCapacityHours}
                className="w-40"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <WorkTable
              items={items}
              today={today}
              columns={columns}
              bare
              emptyTitle="Nothing in this view"
              emptyMessage="This person has no work matching the current filter."
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
