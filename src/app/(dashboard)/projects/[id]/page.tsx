import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CalendarRange } from "lucide-react"

import { KanbanBoardSection } from "@/components/projects/kanban-board-section"
import { ApprovalQueue } from "@/components/projects/approval-queue"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/periods"
import { getProjectsAwaitingDecision } from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Project board" }

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const viewer = await getViewer()
  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle()
  if (!project) notFound()

  // A board that hasn't been signed off yet shows the decision, not the work —
  // there shouldn't be any work on it.
  if (project.approval_status !== "approved") {
    const awaiting = await getProjectsAwaitingDecision(supabase, project.org_id, [
      "pending",
      "rejected",
    ])
    const thisOne = awaiting.filter((p) => p.id === project.id)

    return (
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <PageHeader
          title={project.name}
          description={
            project.approval_status === "rejected"
              ? "This project was sent back to the team."
              : "This project hasn't been approved yet."
          }
        />
        <ApprovalQueue projects={thisOne} canDecide={!viewer.isStaff} showOrg={viewer.isStaff} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {project.target_date && (
              <Badge variant="outline" className="gap-1">
                <CalendarRange className="size-3" />
                Target {formatDate(project.target_date)}
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize">
              {project.status.replace("_", " ")}
            </Badge>
          </div>
        }
      />
      {!viewer.isStaff && (
        <p className="text-sm text-muted-foreground">
          This board is read-only for your account — raise a ticket and the team schedules the work.
        </p>
      )}
      <Suspense fallback={<LoadingSpinner minHeight="20rem" />}>
        <KanbanBoardSection projectId={project.id} orgId={project.org_id} />
      </Suspense>
    </div>
  )
}
