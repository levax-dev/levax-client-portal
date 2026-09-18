import Link from "next/link"

import { cn } from "@/lib/utils"

export interface ViewTab {
  key: string
  label: string
  /** Shown as a pill beside the label. Omit when the number isn't known yet. */
  count?: number
  /** Draws the count in the alert colour — for overdue and similar. */
  alert?: boolean
}

/**
 * Tab strip backed by the URL rather than client state.
 *
 * Each tab is a plain link, so only the active tab's data is ever fetched, the
 * view is shareable, and the whole strip ships as zero JavaScript. Other search
 * params (the period, the department filter) are carried across.
 */
export function ViewTabs({
  tabs,
  active,
  params,
  paramName = "tab",
}: {
  tabs: ViewTab[]
  active: string
  params: Record<string, string | undefined>
  paramName?: string
}) {
  function hrefFor(key: string) {
    const search = new URLSearchParams()
    for (const [name, value] of Object.entries(params)) {
      if (value && name !== paramName) search.set(name, value)
    }
    search.set(paramName, key)
    return `?${search.toString()}`
  }

  return (
    <div
      className="flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  tab.alert && tab.count > 0
                    ? "bg-status-critical/15 text-status-critical"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
