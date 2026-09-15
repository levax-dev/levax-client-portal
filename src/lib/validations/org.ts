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
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
