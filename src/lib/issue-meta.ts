import type { IssuePriority, IssueType, TicketCategory } from "@/types/database"

/** The kinds of request a client can raise. Order is the order they're offered in. */
export const TICKET_CATEGORIES: { value: TicketCategory; label: string; hint: string }[] = [
  {
    value: "app_request",
    label: "App request — new feature",
    hint: "Something new you'd like the application to do.",
  },
  {
    value: "workflow_automation",
    label: "Workflow automation",
    hint: "Automated mailers, alerts, approvals or hand-offs between steps.",
  },
  {
    value: "bug_report",
    label: "Bug report",
    hint: "Something is broken or behaving differently from how it should.",
  },
  {
    value: "bi_report",
    label: "BI report",
    hint: "A new dashboard, report or data extract.",
  },
  { value: "other", label: "Something else", hint: "Anything that doesn't fit the categories above." },
]

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  app_request: "App request",
  workflow_automation: "Automation",
  bug_report: "Bug",
  bi_report: "BI report",
  other: "Other",
}

export function categoryLabel(category: TicketCategory | null): string {
  return category ? CATEGORY_LABELS[category] : "—"
}

/**
 * Category colours double as the legend across tables and boards, so they are
 * defined once here. Chosen to stay distinguishable in both themes and to not
 * collide with the priority palette.
 */
const CATEGORY_COLORS: Record<TicketCategory, string> = {
  app_request: "#6366f1",
  workflow_automation: "#0ea5e9",
  bug_report: "#ef4444",
  bi_report: "#8b5cf6",
  other: "#64748b",
}

export function categoryColor(category: TicketCategory | null): string {
  return category ? CATEGORY_COLORS[category] : "#64748b"
}

const TYPE_LABELS: Record<IssueType, string> = {
  ticket: "Ticket",
  task: "Task",
  bug: "Bug",
  feature: "Feature",
}

export function typeLabel(type: IssueType): string {
  return TYPE_LABELS[type] ?? type
}

export const PRIORITY_ORDER: Record<IssuePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

/** Sorts the most pressing work to the top: overdue first, then by due date, then priority. */
export function compareByUrgency(
  a: { dueDate: string | null; priority: IssuePriority },
  b: { dueDate: string | null; priority: IssuePriority }
): number {
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.dueDate && !b.dueDate) return -1
  if (!a.dueDate && b.dueDate) return 1
  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
}

export function formatHours(hours: number | null): string {
  if (hours === null || hours === 0) return "—"
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}
