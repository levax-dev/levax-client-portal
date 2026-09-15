"use client"

import { useTransition } from "react"
import { CalendarDays, User as UserIcon } from "lucide-react"

import { setIssueAssignee, setIssueColumn, setIssueDueDate, setIssuePriority } from "@/app/actions/issues"
import { PriorityBadge } from "@/components/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { IssuePriority } from "@/types/database"

interface Person {
  id: string
  full_name: string | null
  avatar_url?: string | null
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

export function IssueSidebar({
  issueId,
  columns,
  currentColumnId,
  priority,
  assignee,
  reporter,
  dueDate,
  assignableUsers,
  canEdit,
}: {
  issueId: string
  columns: { id: string; name: string; color: string }[]
  currentColumnId: string
  priority: IssuePriority
  assignee: Person | null
  reporter: Person | null
  dueDate: string | null
  assignableUsers: Person[]
  canEdit: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            {canEdit ? (
              <Select
                defaultValue={currentColumnId}
                disabled={isPending}
                onValueChange={(value) => value && startTransition(() => setIssueColumn(issueId, value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm">{columns.find((c) => c.id === currentColumnId)?.name ?? "—"}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Priority</Label>
            {canEdit ? (
              <Select
                defaultValue={priority}
                disabled={isPending}
                onValueChange={(value) =>
                  value && startTransition(() => setIssuePriority(issueId, value as IssuePriority))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <PriorityBadge priority={priority} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assignee</Label>
            {canEdit ? (
              <Select
                defaultValue={assignee?.id ?? "unassigned"}
                disabled={isPending}
                onValueChange={(value) =>
                  startTransition(() => setIssueAssignee(issueId, value === "unassigned" ? null : value))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {assignableUsers.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.full_name ?? "Unnamed"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{initials(assignee.full_name ?? "?")}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{assignee.full_name}</span>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserIcon className="size-3.5" />
                Unassigned
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Due date</Label>
            {canEdit ? (
              <Input
                type="date"
                defaultValue={dueDate ?? ""}
                disabled={isPending}
                onChange={(e) =>
                  startTransition(() => setIssueDueDate(issueId, e.target.value || null))
                }
              />
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {dueDate ? new Date(dueDate).toLocaleDateString() : "No due date"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reporter</CardTitle>
        </CardHeader>
        <CardContent>
          {reporter ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                {reporter.avatar_url && <AvatarImage src={reporter.avatar_url} />}
                <AvatarFallback className="text-[10px]">{initials(reporter.full_name ?? "?")}</AvatarFallback>
              </Avatar>
              <span className="text-sm">{reporter.full_name}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unknown</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
