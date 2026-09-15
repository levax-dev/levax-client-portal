import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

import { AttachmentsSection } from "@/components/tickets/attachments-section"
import { CommentsSection } from "@/components/tickets/comments-section"
import { IssueSidebarSection } from "@/components/tickets/issue-sidebar-section"
import { AttachmentsSkeleton, CommentsSkeleton, IssueSidebarSkeleton } from "@/components/tickets/ticket-skeletons"
import { PriorityBadge } from "@/components/priority-badge"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { requireUser } from "@/lib/auth"
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
      `id, title, description, priority, type, created_at, due_date, org_id, project_id, linked_project_id,
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
  const reporter = issue.reporter as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null
  const assignee = issue.assignee as unknown as { id: string; full_name: string | null; avatar_url: string | null } | null
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
            <PriorityBadge priority={issue.priority} />
            <span className="text-sm text-muted-foreground">
              Opened {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })} by{" "}
              {reporter?.full_name ?? "someone"}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{issue.title}</h1>
          {issue.description && (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{issue.description}</p>
          )}
        </div>

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
          projectId={issue.project_id}
          orgId={issue.org_id}
          currentColumnId={column?.id ?? ""}
          priority={issue.priority}
          assignee={assignee}
          reporter={reporter}
          dueDate={issue.due_date}
          canEdit={user.isStaff}
          showLinkedProject={user.isStaff && issue.type === "ticket"}
          linkedProject={linkedProject}
        />
      </Suspense>
    </div>
  )
}
