import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export function LoadingSpinner({ className, minHeight = "12rem" }: { className?: string; minHeight?: string }) {
  return (
    <div
      className={cn("flex w-full items-center justify-center text-muted-foreground", className)}
      style={{ minHeight }}
    >
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
