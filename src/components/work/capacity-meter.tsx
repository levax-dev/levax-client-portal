import { cn } from "@/lib/utils"

type Severity = "ok" | "full" | "over"

function severityOf(ratio: number): Severity {
  if (ratio > 1) return "over"
  if (ratio >= 0.85) return "full"
  return "ok"
}

/**
 * A single ratio against a limit — planned hours versus the hours someone
 * actually has. A meter, not a two-slice pie.
 *
 * The unfilled track is a lighter step of the fill's own hue rather than a
 * neutral grey, so the severity reads across the whole bar at a glance instead
 * of only in the filled part. The figure beside it states the same thing in
 * words, because the colour on its own can't say "over capacity".
 */
export function CapacityMeter({
  planned,
  capacity,
  className,
}: {
  planned: number
  capacity: number
  className?: string
}) {
  const safeCapacity = capacity > 0 ? capacity : 40
  const ratio = planned / safeCapacity
  const severity = severityOf(ratio)
  const percent = Math.round(ratio * 100)

  const track: Record<Severity, string> = {
    ok: "bg-primary/15",
    full: "bg-status-warning/20",
    over: "bg-status-critical/20",
  }
  const fill: Record<Severity, string> = {
    ok: "bg-primary",
    full: "bg-status-warning",
    over: "bg-status-critical",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn("h-2 w-full min-w-16 overflow-hidden rounded-full", track[severity])}
        role="meter"
        aria-valuenow={planned}
        aria-valuemin={0}
        aria-valuemax={safeCapacity}
        aria-label={`${planned} of ${safeCapacity} hours planned`}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", fill[severity])}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span
        className={cn(
          "shrink-0 text-xs tabular-nums",
          severity === "over" ? "font-medium text-status-critical" : "text-muted-foreground"
        )}
      >
        {planned}/{safeCapacity}h
      </span>
    </div>
  )
}

/**
 * Completion rate as a plain proportion bar. Sequential, one hue — this is a
 * magnitude, not a state, so it deliberately doesn't borrow the status colours.
 */
export function RateMeter({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-full min-w-16 overflow-hidden rounded-full bg-primary/15">
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  )
}
