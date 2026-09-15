import { z } from "zod"

export const kbCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(500).optional().default(""),
})
export type KbCategoryInput = z.infer<typeof kbCategorySchema>

export const kbArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  categoryId: z.uuid().nullable().optional(),
  excerpt: z.string().max(500).optional().default(""),
  content: z.string().min(1, "Content is required"),
  isPublished: z.boolean().default(true),
  orgId: z.uuid().nullable().optional(),
})
export type KbArticleInput = z.infer<typeof kbArticleSchema>
