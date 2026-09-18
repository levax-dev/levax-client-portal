"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"

import { moveIssue } from "@/app/actions/issues"
import { NewIssueDialog, type TicketOption } from "@/components/projects/new-issue-dialog"
import { PriorityBadge } from "@/components/priority-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { IssuePriority } from "@/types/database"

export interface KanbanIssue {
  id: string
  title: string
  priority: IssuePriority
  type: string
  position: number
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null
}

export interface KanbanColumn {
  id: string
  name: string
  color: string
  issues: KanbanIssue[]
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

function IssueCard({ issue, canEdit = true }: { issue: KanbanIssue; canEdit?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    disabled: !canEdit,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-xs transition-opacity",
        canEdit && "touch-none",
        isDragging && "opacity-40"
      )}
    >
      <Link href={`/tickets/${issue.id}`} className="space-y-2 block" onClick={(e) => isDragging && e.preventDefault()}>
        <p className="text-sm font-medium text-balance">{issue.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PriorityBadge priority={issue.priority} />
            <Badge variant="outline" className="text-[10px] uppercase">
              {issue.type}
            </Badge>
          </div>
          {issue.assignee && (
            <Avatar className="size-5">
              {issue.assignee.avatar_url && <AvatarImage src={issue.assignee.avatar_url} />}
              <AvatarFallback className="text-[9px]">
                {initials(issue.assignee.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </Link>
    </div>
  )
}

function Column({
  column,
  onAddIssue,
  canEdit,
}: {
  column: KanbanColumn
  onAddIssue: (columnId: string) => void
  canEdit: boolean
}) {
  const { setNodeRef } = useDroppable({ id: column.id, disabled: !canEdit })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />
          <span className="text-sm font-medium">{column.name}</span>
          <span className="text-xs text-muted-foreground">{column.issues.length}</span>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={"Add a task to " + column.name}
            onClick={() => onAddIssue(column.id)}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
      </div>
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
        <SortableContext items={column.issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} canEdit={canEdit} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export function KanbanBoard({
  projectId,
  initialColumns,
  assignableUsers,
  tickets,
  canEdit,
}: {
  projectId: string
  initialColumns: KanbanColumn[]
  assignableUsers: { id: string; full_name: string | null }[]
  tickets: TicketOption[]
  /** Clients can read the board but not move or add to it. */
  canEdit: boolean
}) {
  const [columns, setColumns] = useState(initialColumns)
  const [activeIssue, setActiveIssue] = useState<KanbanIssue | null>(null)
  const [dialogColumnId, setDialogColumnId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const findColumnOf = (issueId: string) =>
    columns.find((c) => c.issues.some((i) => i.id === issueId))

  const issueIndex = useMemo(() => {
    const map = new Map<string, KanbanIssue>()
    columns.forEach((c) => c.issues.forEach((i) => map.set(i.id, i)))
    return map
  }, [columns])

  function handleDragStart(event: DragStartEvent) {
    setActiveIssue(issueIndex.get(String(event.active.id)) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null)
    if (!canEdit) return
    const { active, over } = event
    if (!over) return

    const sourceColumn = findColumnOf(String(active.id))
    if (!sourceColumn) return

    const isOverColumn = columns.some((c) => c.id === over.id)
    const targetColumn = isOverColumn ? columns.find((c) => c.id === over.id)! : findColumnOf(String(over.id))
    if (!targetColumn) return

    const movingIssue = sourceColumn.issues.find((i) => i.id === active.id)
    if (!movingIssue) return

    setColumns((prev) => {
      const next = prev.map((c) => ({ ...c, issues: [...c.issues] }))
      const from = next.find((c) => c.id === sourceColumn.id)!
      const to = next.find((c) => c.id === targetColumn.id)!

      from.issues = from.issues.filter((i) => i.id !== movingIssue.id)

      const overIndex = isOverColumn ? to.issues.length : to.issues.findIndex((i) => i.id === over.id)
      const insertAt = overIndex === -1 ? to.issues.length : overIndex

      const before = to.issues[insertAt - 1]
      const after = to.issues[insertAt]
      const newPosition =
        before && after
          ? (before.position + after.position) / 2
          : before
            ? before.position + 1
            : after
              ? after.position - 1
              : 0

      to.issues.splice(insertAt, 0, { ...movingIssue, position: newPosition })

      void moveIssue({ id: movingIssue.id, columnId: to.id, position: newPosition })

      return next
    })
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddIssue={setDialogColumnId}
              canEdit={canEdit}
            />
          ))}
        </div>
        <DragOverlay>{activeIssue && <IssueCard issue={activeIssue} />}</DragOverlay>
      </DndContext>

      {canEdit && (
        <NewIssueDialog
          projectId={projectId}
          columnId={dialogColumnId}
          assignableUsers={assignableUsers}
          tickets={tickets}
          onOpenChange={(open) => !open && setDialogColumnId(null)}
        />
      )}
    </>
  )
}
