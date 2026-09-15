import { Book } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { KbBrowser, type KbArticleSummary } from "@/components/kb/kb-browser"
import { createClient } from "@/lib/supabase/server"

export async function KbListSection() {
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

  if (summaries.length === 0) {
    return <EmptyState icon={Book} title="No articles yet" description="Published articles will show up here." />
  }

  return <KbBrowser categories={categories ?? []} articles={summaries} />
}
