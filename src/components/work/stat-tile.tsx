import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type TileTone = "default" | "good" | "warning" | "critical"

const TONE_ACCENT: Record<TileTone, string> = {
  default: "bg-primary",
  good: "bg-status-good",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
}

const TONE_VALUE: Record<TileTone, string> = {
  default: "text-foreground",
  good: "text-foreground",
  warning: "text-foreground",
  critical: "text-status-critical",
}

/**
 * One headline number.
 *
 * The value keeps the font's proportional figures — `tabular-nums` widens every
 * digit to a zero, which makes a number like 121 look gappy at this size. Tables
 * are where tabular figures belong.
 *
 * Tone shows as a left accent bar plus (for critical) the value's own colour, so
 * a tile never relies on colour alone to say "this one is bad" — the label says
 * so too.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
}: {
  label: string
  value: number | string
  hint?: string
  icon?: LucideIcon
  tone?: TileTone
  href?: string
}) {
  const body = (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-hidden p-4",
        href && "transition-colors hover:bg-accent/40"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", TONE_ACCENT[tone])} aria-hidden />
      <div className="flex items-start justify-between gap-2 pl-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      </div>
      <p className={cn("pl-2 text-3xl font-semibold tracking-tight", TONE_VALUE[tone])}>{value}</p>
      {hint && <p className="pl-2 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

/** The one number a page leads with. At most one per view. */
export function HeroStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-5xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
