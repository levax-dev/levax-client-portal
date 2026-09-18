import { z } from "zod"

export const orgRoles = ["admin", "member"] as const

export const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(orgRoles).default("member"),
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const updateOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(120),
})
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>

export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(120),
  adminEmail: z.email("Enter a valid email address"),
})
export type CreateOrgInput = z.infer<typeof createOrgSchema>

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(120),
  phone: z.string().max(30).optional().default(""),
  jobTitle: z.string().max(120).optional().default(""),
  location: z.string().max(120).optional().default(""),
  bio: z.string().max(500).optional().default(""),
  /** Staff only — drives the load-vs-capacity meters on the planning views. */
  weeklyCapacityHours: z
    .union([z.literal(""), z.coerce.number().min(1, "At least an hour").max(80, "80 hours is the ceiling")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
