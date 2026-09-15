import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { NewProjectForm } from "@/components/projects/new-project-form"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "New project" }

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader title="New project" description="Spin up a Kanban board to track work." />
      <Card>
        <CardContent className="pt-6">
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  )
}
