import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { LoadingSpinner } from "@/components/loading-spinner"
import { PageHeader } from "@/components/page-header"
import { KbListSection } from "@/components/kb/kb-list-section"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"

export const metadata: Metadata = { title: "Knowledge base" }

export default async function KnowledgeBasePage() {
  const user = await requireUser()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge base"
        description="Guides and answers to common questions."
        actions={
          user.isStaff && (
            <Button render={<Link href="/knowledge-base/new" />}>
              <Plus />
              New article
            </Button>
          )
        }
      />
      <Suspense fallback={<LoadingSpinner />}>
        <KbListSection />
      </Suspense>
    </div>
  )
}
