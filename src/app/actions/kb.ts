"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/slug"
import { kbArticleSchema, kbCategorySchema } from "@/lib/validations/kb"

export type ActionState = { error?: string; success?: string } | null

export async function createKbCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = kbCategorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const supabase = await createClient()
  const { error } = await supabase.from("kb_categories").insert({
    name: parsed.data.name,
    description: parsed.data.description,
    slug: slugify(parsed.data.name),
  })
  if (error) return { error: error.message }

  revalidatePath("/knowledge-base")
  return { success: "Category created." }
}

export async function createKbArticle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    ...Object.fromEntries(formData),
    isPublished: formData.get("isPublished") === "on" || formData.get("isPublished") === "true",
    categoryId: formData.get("categoryId") || null,
  }
  const parsed = kbArticleSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const supabase = await createClient()

  const baseSlug = slugify(parsed.data.title)
  let slug = baseSlug
  for (let i = 1; i <= 5; i++) {
    const { data: existing } = await supabase.from("kb_articles").select("id").eq("slug", slug).maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${i}`
  }

  const { data: article, error } = await supabase
    .from("kb_articles")
    .insert({
      title: parsed.data.title,
      slug,
      category_id: parsed.data.categoryId,
      excerpt: parsed.data.excerpt,
      content: parsed.data.content,
      is_published: parsed.data.isPublished,
      author_id: user.id,
    })
    .select("slug")
    .single()
  if (error || !article) return { error: error?.message ?? "Could not create article." }

  revalidatePath("/knowledge-base")
  redirect(`/knowledge-base/${article.slug}`)
}

export async function incrementArticleViews(id: string) {
  const supabase = await createClient()
  await supabase.rpc("increment_kb_view_count", { p_article_id: id })
}
