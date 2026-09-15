import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { NewArticleForm } from "@/components/kb/new-article-form"
import { NewCategoryForm } from "@/components/kb/new-category-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "New article" }

export default async function NewKbArticlePage() {
  const user = await requireUser()
  if (!user.isStaff) redirect("/knowledge-base")

  const supabase = await createClient()
  const { data: categories } = await supabase.from("kb_categories").select("*").order("position")

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-6">
        <PageHeader title="New article" description="Publish a new knowledge base article." />
        <Card>
          <CardContent className="pt-6">
            <NewArticleForm categories={categories ?? []} />
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCategoryForm />
        </CardContent>
      </Card>
    </div>
  )
}
