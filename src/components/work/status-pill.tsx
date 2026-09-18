import { AlertTriangle, CalendarClock, CheckCircle2, CircleDashed, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { daysBetween } from "@/lib/periods"

/**
 * Where a piece of work stands against its delivery date.
 *
 * `overdue` and `done` are red and green, which no amount of tuning makes
 * distinguishable under deuteranopia — so every pill renders an icon and a
 * word, and the colour only reinforces them. Never render one icon-only.
 */
export type DeliveryState = "done" | "ontrack" | "today" | "overdue" | "upcoming" | "unscheduled"

const STATES: Record<
  DeliveryState,
  { label: string; icon: typeof Clock; className: string }
> = {
  done: {
    label: "Delivered",
    icon: CheckCircle2,
    className: "border-status-good/30 bg-status-good/10 text-status-good",
  },
  ontrack: {
    label: "On track",
    icon: CheckCircle2,
    className: "border-status-good/30 bg-status-good/10 text-status-good",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "border-status-critical/30 bg-status-critical/10 text-status-critical",
  },
  today: {
    label: "Due today",
    icon: Clock,
    className: "border-status-warning/40 bg-status-warning/15 text-status-warning",
  },
  upcoming: {
    label: "Scheduled",
    icon: CalendarClock,
    className: "border-border bg-muted text-muted-foreground",
  },
  unscheduled: {
    label: "No date",
    icon: CircleDashed,
    className: "border-dashed border-border bg-transparent text-muted-foreground",
  },
}

export function deliveryState(
  item: { dueDate: string | null; resolvedAt: string | null },
  today: string
): DeliveryState {
  if (item.resolvedAt) return "done"
  if (!item.dueDate) return "unscheduled"
  if (item.dueDate < today) return "overdue"
  if (item.dueDate === today) return "today"
  return "upcoming"
}

export function StatusPill({
  state,
  label,
  className,
}: {
  state: DeliveryState
  /** Overrides the default word — e.g. "3 days overdue" instead of "Overdue". */
  label?: string
  className?: string
}) {
  const spec = STATES[state]
  const Icon = spec.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        spec.className,
        className
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {label ?? spec.label}
    </span>
  )
}

/** The pill with the day count spelled out, for date columns. */
export function DueCell({
  dueDate,
  resolvedAt,
  today,
}: {
  dueDate: string | null
  resolvedAt: string | null
  today: string
}) {
  const state = deliveryState({ dueDate, resolvedAt }, today)
  if (state === "unscheduled") return <StatusPill state="unscheduled" />
  if (state === "overdue" && dueDate) {
    const days = Math.abs(daysBetween(today, dueDate))
    return <StatusPill state="overdue" label={`${days}d overdue`} />
  }
  return <StatusPill state={state} />
}
