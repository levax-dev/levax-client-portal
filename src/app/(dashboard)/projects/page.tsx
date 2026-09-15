import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { ProjectsListSection } from "@/components/projects/projects-list-section"

export const metadata: Metadata = { title: "Projects" }

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgParam } = await searchParams

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Track work with a Kanban board per project." />
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectsListSection orgParam={orgParam} />
      </Suspense>
    </div>
  )
}
