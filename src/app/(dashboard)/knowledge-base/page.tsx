import type { Metadata } from "next"
import Link from "next/link"
import { Book, Plus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { KbBrowser, type KbArticleSummary } from "@/components/kb/kb-browser"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Knowledge base" }

export default async function KnowledgeBasePage() {
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from("kb_categories").select("*").order("position"),
    supabase
      .from("kb_articles")
      .select("id, title, slug, excerpt, category_id, view_count")
      .eq("is_published", true)
      .order("title"),
  ])

  const summaries: KbArticleSummary[] = articles ?? []

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

      {summaries.length === 0 ? (
        <EmptyState icon={Book} title="No articles yet" description="Published articles will show up here." />
      ) : (
        <KbBrowser categories={categories ?? []} articles={summaries} />
      )}
    </div>
  )
}
