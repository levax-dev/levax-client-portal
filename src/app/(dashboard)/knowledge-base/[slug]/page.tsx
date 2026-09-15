import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Eye } from "lucide-react"

import { incrementArticleViews } from "@/app/actions/kb"
import { Markdown } from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from("kb_articles").select("title").eq("slug", slug).maybeSingle()
  return { title: data?.title ?? "Article" }
}

export default async function KbArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  await requireUser()
  const supabase = await createClient()

  const { data: article } = await supabase
    .from("kb_articles")
    .select("*, kb_categories(name)")
    .eq("slug", slug)
    .maybeSingle()

  if (!article) notFound()

  void incrementArticleViews(article.id)

  const category = article.kb_categories as unknown as { name: string } | null

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {category && <Badge variant="secondary">{category.name}</Badge>}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            {article.view_count} views
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">{article.title}</h1>
      </div>
      <Markdown>{article.content}</Markdown>
    </article>
  )
}
