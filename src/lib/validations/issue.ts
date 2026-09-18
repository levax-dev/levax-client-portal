import { z } from "zod"

export const issuePriorities = ["low", "medium", "high", "urgent"] as const
export const issueTypes = ["ticket", "task", "bug", "feature"] as const
export const ticketCategories = [
  "app_request",
  "workflow_automation",
  "bug_report",
  "bi_report",
  "other",
] as const

/** `<input type="date">` submits "" when cleared; treat that as "no date". */
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .optional()
  .or(z.literal("").transform(() => undefined))

/** Effort arrives as a string from FormData; blank means "not estimated yet". */
const optionalHours = z
  .union([z.literal(""), z.coerce.number().min(0, "Hours can't be negative").max(1000, "That's over 1000 hours")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))

export const createTicketSchema = z.object({
  projectId: z.uuid("Choose a project"),
  departmentId: z.uuid().optional(),
  category: z.enum(ticketCategories, { message: "Choose what kind of request this is" }),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional().default(""),
})
export type CreateTicketInput = z.infer<typeof createTicketSchema>

export const createIssueSchema = z.object({
  projectId: z.uuid(),
  columnId: z.uuid(),
  /** Every task traces back to a ticket — enforced here and by a DB constraint. */
  parentTicketId: z.uuid("Every task must be raised from a ticket"),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(10000).optional().default(""),
  priority: z.enum(issuePriorities).default("medium"),
  type: z.enum(issueTypes).default("task"),
  assigneeId: z.string().optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  estimatedHours: optionalHours,
})
export type CreateIssueInput = z.infer<typeof createIssueSchema>

export const updateIssueSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  priority: z.enum(issuePriorities).optional(),
  assigneeId: z.string().nullable().optional(),
  startDate: optionalDate,
  dueDate: optionalDate,
  estimatedHours: optionalHours,
})
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>

export const moveIssueSchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  position: z.number(),
})
export type MoveIssueInput = z.infer<typeof moveIssueSchema>

/** One task spawned off a ticket during triage. A ticket can spawn many. */
export const convertTicketSchema = z.object({
  ticketId: z.uuid(),
  projectId: z.uuid("Choose the project this work belongs to"),
  title: z.string().min(1, "Give the task a title").max(200),
  description: z.string().max(10000).optional().default(""),
  assigneeId: z.string().optional(),
  priority: z.enum(issuePriorities).default("medium"),
  startDate: optionalDate,
  dueDate: optionalDate,
  estimatedHours: optionalHours,
})
export type ConvertTicketInput = z.infer<typeof convertTicketSchema>

export const scheduleIssueSchema = z.object({
  id: z.uuid(),
  startDate: optionalDate,
  dueDate: optionalDate,
  estimatedHours: optionalHours,
  assigneeId: z.string().optional(),
})
export type ScheduleIssueInput = z.infer<typeof scheduleIssueSchema>

export const completeIssueSchema = z.object({
  id: z.uuid(),
  resolutionNote: z
    .string()
    .min(1, "Say what was done — this is what the client reads in the work log")
    .max(4000),
})
export type CompleteIssueInput = z.infer<typeof completeIssueSchema>

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
  startDate: optionalDate,
  targetDate: optionalDate,
})
export type CreateProjectInput = z.infer<typeof createProjectSchema>

export const decideProjectSchema = z.object({
  projectId: z.uuid(),
  approve: z.boolean(),
  note: z.string().max(2000).optional(),
})
export type DecideProjectInput = z.infer<typeof decideProjectSchema>
