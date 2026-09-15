"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, FolderOpen, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { KbCategory } from "@/types/database"

export interface KbArticleSummary {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category_id: string | null
  view_count: number
}

export function KbBrowser({
  categories,
  articles,
}: {
  categories: KbCategory[]
  articles: KbArticleSummary[]
}) {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | "all">("all")

  const filtered = useMemo(
    () =>
      articles.filter((a) => {
        if (activeCategory !== "all" && a.category_id !== activeCategory) return false
        if (query && !a.title.toLowerCase().includes(query.toLowerCase())) return false
        return true
      }),
    [articles, query, activeCategory]
  )

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search the knowledge base…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            activeCategory === "all" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              activeCategory === c.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((article) => (
          <Link key={article.id} href={`/knowledge-base/${article.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span>{article.title}</span>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <FolderOpen className="size-6" />
            <p className="text-sm">No articles match your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
