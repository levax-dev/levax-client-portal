/**
 * Plain-date helpers for the Today / This week / This month / Custom toggles.
 *
 * `due_date` and `start_date` are Postgres `date` columns — calendar days with
 * no time or zone. Turning them into `Date` objects invites off-by-one-day bugs
 * the moment the server's zone differs from the team's, so everything here
 * stays on `YYYY-MM-DD` strings and does its arithmetic in UTC, where a day is
 * always 24 hours.
 *
 * "Today" is resolved in the business timezone (`NEXT_PUBLIC_APP_TIMEZONE`),
 * not the server's — on Vercel the server runs in UTC, which would roll the
 * date over mid-morning for a team in Asia.
 */

export const BUSINESS_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

export type PeriodKey = "today" | "week" | "month" | "custom"

export interface Period {
  key: PeriodKey
  /** Inclusive start, `YYYY-MM-DD`. */
  from: string
  /** Inclusive end, `YYYY-MM-DD`. */
  to: string
  label: string
}

const DAY_MS = 86_400_000
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Today's calendar date in the business timezone. `en-CA` formats as `YYYY-MM-DD`. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

function toUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function fromUTC(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return fromUTC(new Date(toUTC(iso).getTime() + days * DAY_MS))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / DAY_MS)
}

/** Monday of the week containing `iso` — weeks are Mon–Sun, matching how teams plan. */
export function startOfWeek(iso: string): string {
  const day = toUTC(iso).getUTCDay() // 0 = Sunday
  return addDays(iso, day === 0 ? -6 : 1 - day)
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function endOfMonth(iso: string): string {
  const d = toUTC(iso)
  return fromUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}

export function isValidISODate(value: string | undefined | null): value is string {
  return !!value && ISO_DATE.test(value) && !Number.isNaN(toUTC(value).getTime())
}

/**
 * Turns URL search params into a concrete inclusive date range. Falls back to
 * the requested preset whenever a custom range is missing or malformed, so a
 * hand-edited URL degrades to something sensible instead of an empty table.
 */
export function resolvePeriod(
  key: string | undefined,
  from?: string,
  to?: string,
  today: string = todayISO()
): Period {
  if (key === "custom" && isValidISODate(from) && isValidISODate(to) && from <= to) {
    return { key: "custom", from, to, label: `${formatDate(from)} – ${formatDate(to)}` }
  }

  switch (key) {
    case "month": {
      const start = startOfMonth(today)
      return { key: "month", from: start, to: endOfMonth(today), label: formatMonth(today) }
    }
    case "week": {
      const start = startOfWeek(today)
      const end = addDays(start, 6)
      return { key: "week", from: start, to: end, label: `${formatDate(start)} – ${formatDate(end)}` }
    }
    default:
      return { key: "today", from: today, to: today, label: formatDate(today) }
  }
}

/** Milliseconds the business timezone is ahead of UTC at a given instant. */
function zoneOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  )
  return asIfUTC - at.getTime()
}

/** The UTC instant of a wall-clock time on a given calendar day in the business zone. */
function zonedInstant(iso: string, time: string): Date {
  const naive = new Date(`${iso}T${time}Z`)
  // One correction lands on the right instant everywhere except inside a DST
  // transition, where a second pass settles it.
  let result = new Date(naive.getTime() - zoneOffsetMs(naive))
  result = new Date(naive.getTime() - zoneOffsetMs(result))
  return result
}

/**
 * The half-open UTC window covering whole calendar days `from`..`to` in the
 * business timezone.
 *
 * `resolved_at` is a timestamp, but "delivered today" means the team's day, not
 * UTC's. Comparing a timestamp against bare dates would file work closed at
 * 9am in Kolkata under the previous day.
 */
export function timestampRange(from: string, to: string): { startUTC: string; endUTC: string } {
  return {
    startUTC: zonedInstant(from, "00:00:00.000").toISOString(),
    // Exclusive upper bound: midnight at the start of the following day.
    endUTC: zonedInstant(addDays(to, 1), "00:00:00.000").toISOString(),
  }
}

/** The calendar day an instant falls on, in the business timezone. */
export function instantToDate(isoTimestamp: string): string {
  return todayISO(new Date(isoTimestamp))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(toUTC(iso))
}

/** Compact form for dense table cells — `12 Mar`, with the year only when it differs. */
export function formatDateShort(iso: string, today: string = todayISO()): string {
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(toUTC(iso))
}

export function formatMonth(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    toUTC(iso)
  )
}

export function formatWeekday(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(toUTC(iso))
}

/** Every calendar day in the period, used to lay the weekly plan out day by day. */
export function eachDay(period: Period): string[] {
  const days: string[] = []
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) days.push(d)
  return days
}

/** "2 days overdue" / "due today" / "in 3 days" — relative to a plain date. */
export function describeDueDate(due: string, today: string = todayISO()): string {
  const diff = daysBetween(today, due)
  if (diff === 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  if (diff === -1) return "1 day overdue"
  if (diff < 0) return `${Math.abs(diff)} days overdue`
  return `In ${diff} days`
}
