import { ArrowDown, ArrowUp, Equal, Flame } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { IssuePriority } from "@/types/database"

const config: Record<IssuePriority, { label: string; icon: typeof Flame; className: string }> = {
  urgent: { label: "Urgent", icon: Flame, className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  high: { label: "High", icon: ArrowUp, className: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  medium: { label: "Medium", icon: Equal, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  low: { label: "Low", icon: ArrowDown, className: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const { label, icon: Icon, className } = config[priority]
  return (
    <Badge variant="secondary" className={cn("gap-1 font-medium", className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  )
}
