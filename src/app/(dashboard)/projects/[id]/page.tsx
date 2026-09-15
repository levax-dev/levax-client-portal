import type { Metadata } from "next"
import { Suspense } from "react"
import { notFound } from "next/navigation"

import { KanbanBoardSection } from "@/components/projects/kanban-board-section"
import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Project board" }

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireUser()
  const supabase = await createClient()

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle()
  if (!project) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <Badge variant="secondary" className="capitalize">
            {project.status.replace("_", " ")}
          </Badge>
        }
      />
      <Suspense fallback={<LoadingSpinner minHeight="20rem" />}>
        <KanbanBoardSection projectId={project.id} orgId={project.org_id} />
      </Suspense>
    </div>
  )
}
