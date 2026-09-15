import { z } from "zod"

export const issuePriorities = ["low", "medium", "high", "urgent"] as const
export const issueTypes = ["ticket", "task", "bug", "feature"] as const

export const createTicketSchema = z.object({
  projectId: z.uuid("Choose a project"),
  departmentId: z.uuid().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional().default(""),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const createIssueSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional().default(""),
  priority: z.enum(issuePriorities).default("medium"),
  type: z.enum(issueTypes).default("task"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
})
export type CreateIssueInput = z.infer<typeof createIssueSchema>

export const updateIssueSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  priority: z.enum(issuePriorities).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
})
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>

export const moveIssueSchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  position: z.number(),
})
export type MoveIssueInput = z.infer<typeof moveIssueSchema>

export const commentSchema = z.object({
  issueId: z.uuid(),
  body: z.string().min(1, "Comment can't be empty").max(10000),
  isInternal: z.boolean().default(false),
})
export type CommentInput = z.infer<typeof commentSchema>

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional().default(""),
  departmentIds: z.array(z.uuid()).min(1, "Choose at least one department"),
  leadId: z.string().optional(),
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>
