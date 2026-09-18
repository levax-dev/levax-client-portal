"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { PeriodKey } from "@/lib/periods"

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
]

/**
 * The Today / This week / This month / Custom switch.
 *
 * State lives in the URL rather than component state, so the server components
 * below re-render with the new range, and a particular view stays shareable and
 * bookmarkable. Other params (which tab you're on, which department) are
 * carried through untouched.
 */
export function PeriodToggle({
  active,
  from,
  to,
  className,
}: {
  active: PeriodKey
  from: string
  to: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)
  const [open, setOpen] = useState(false)

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const rangeInvalid = customFrom > customTo

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border bg-card p-1", className)}>
      {PRESETS.map((preset) => (
        <Button
          key={preset.key}
          size="sm"
          variant={active === preset.key ? "secondary" : "ghost"}
          aria-pressed={active === preset.key}
          onClick={() => apply({ period: preset.key, from: null, to: null })}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button size="sm" variant={active === "custom" ? "secondary" : "ghost"}>
              <CalendarRange />
              {active === "custom" ? `${from} → ${to}` : "Custom"}
            </Button>
          }
        />
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="period-from" className="text-xs text-muted-foreground">
              From
            </Label>
            <Input
              id="period-from"
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period-to" className="text-xs text-muted-foreground">
              To
            </Label>
            <Input
              id="period-to"
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          {rangeInvalid && (
            <p className="text-xs text-status-critical">The start date is after the end date.</p>
          )}
          <Button
            size="sm"
            className="w-full"
            disabled={rangeInvalid || !customFrom || !customTo}
            onClick={() => {
              setOpen(false)
              apply({ period: "custom", from: customFrom, to: customTo })
            }}
          >
            Apply range
          </Button>
        </PopoverContent>
      </Popover>

      {isPending && <Loader2 className="mr-1 size-3.5 animate-spin text-muted-foreground" />}
    </div>
  )
}
