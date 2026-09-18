import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2 } from "lucide-react"

import { AttachmentsSection } from "@/components/tickets/attachments-section"
import { CommentsSection } from "@/components/tickets/comments-section"
import { IssueSidebarSection } from "@/components/tickets/issue-sidebar-section"
import { LinkedWorkSection } from "@/components/tickets/linked-work-section"
import {
  AttachmentsSkeleton,
  CommentsSkeleton,
  IssueSidebarSkeleton,
} from "@/components/tickets/ticket-skeletons"
import { PriorityBadge } from "@/components/priority-badge"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth"
import { categoryColor, categoryLabel } from "@/lib/issue-meta"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Ticket" }

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const { data: issue } = await supabase
    .from("issues")
    .select(
      `id, title, description, priority, type, category, created_at, start_date, due_date,
       estimated_hours, resolved_at, resolution_note, org_id, project_id, linked_project_id,
       parent_ticket_id,
       board_columns(id, name, color, is_done_column, project_id),
       reporter:profiles!issues_reporter_id_fkey(id, full_name, avatar_url, email),
       assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url, email),
       linked_project:projects!issues_linked_project_id_fkey(id, name)`
    )
    .eq("id", id)
    .maybeSingle()

  if (!issue) notFound()

  const column = issue.board_columns as unknown as {
    id: string
    name: string
    color: string
    is_done_column: boolean
  } | null
  const reporter = issue.reporter as unknown as {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  const assignee = issue.assignee as unknown as {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  const linkedProject = issue.linked_project as unknown as { id: string; name: string } | null

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {column && (
              <Badge
                variant="secondary"
                style={{
                  backgroundColor: `color-mix(in oklch, ${column.color} 15%, transparent)`,
                  color: column.color,
                }}
              >
                {column.name}
              </Badge>
            )}
            {issue.category && (
              <Badge
                variant="outline"
                style={{ borderColor: categoryColor(issue.category), color: categoryColor(issue.category) }}
              >
                {categoryLabel(issue.category)}
              </Badge>
            )}
            <PriorityBadge priority={issue.priority} />
            {issue.type !== "ticket" && (
              <Badge variant="outline" className="text-[10px] uppercase">
                {issue.type}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Opened {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })} by{" "}
              {reporter?.full_name ?? "someone"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{issue.title}</h1>
          {issue.description && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{issue.description}</p>
          )}
        </div>

        {issue.resolved_at && issue.resolution_note && (
          <div className="rounded-lg border border-status-good/30 bg-status-good/5 p-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-status-good">
              <CheckCircle2 className="size-4" />
              Delivered
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">{issue.resolution_note}</p>
          </div>
        )}

        <Suspense fallback={<Skeleton className="h-32 w-full rounded-lg" />}>
          <LinkedWorkSection
            issueId={issue.id}
            issueTitle={issue.title}
            issueType={issue.type}
            orgId={issue.org_id}
            parentTicketId={issue.parent_ticket_id}
            canTriage={user.isStaff}
          />
        </Suspense>

        <Suspense fallback={<AttachmentsSkeleton />}>
          <AttachmentsSection issueId={issue.id} orgId={issue.org_id} />
        </Suspense>

        <Separator />

        <Suspense fallback={<CommentsSkeleton />}>
          <CommentsSection issueId={issue.id} currentUserId={user.id} isStaff={user.isStaff} />
        </Suspense>
      </div>

      <Suspense fallback={<IssueSidebarSkeleton />}>
        <IssueSidebarSection
          issueId={issue.id}
          issueTitle={issue.title}
          projectId={issue.project_id}
          orgId={issue.org_id}
          currentColumnId={column?.id ?? ""}
          priority={issue.priority}
          assignee={assignee}
          reporter={reporter}
          startDate={issue.start_date}
          dueDate={issue.due_date}
          estimatedHours={issue.estimated_hours}
          isResolved={!!issue.resolved_at}
          canEdit={user.isStaff}
          showLinkedProject={user.isStaff && issue.type === "ticket"}
          linkedProject={linkedProject}
        />
      </Suspense>
    </div>
  )
}
