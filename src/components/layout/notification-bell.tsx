"use client"

import { useTransition } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bell, CheckCheck } from "lucide-react"

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AppNotification } from "@/types/database"
import { cn } from "@/lib/utils"

export function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [isPending, startTransition] = useTransition()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" aria-label="Notifications" />}
      >
        <Bell />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto gap-1 px-1.5 py-1 text-xs"
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => !n.is_read && startTransition(() => markNotificationRead(n.id))}
                  className={cn(
                    "flex flex-col gap-0.5 border-b px-3 py-2.5 text-sm last:border-b-0 hover:bg-accent",
                    !n.is_read && "bg-accent/40"
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {!n.is_read && <span className="size-1.5 rounded-full bg-primary" />}
                    {n.title}
                  </span>
                  {n.body && <span className="text-muted-foreground">{n.body}</span>}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
