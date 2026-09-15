"use server"

import { revalidatePath } from "next/cache"

import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createDepartmentSchema } from "@/lib/validations/department"

export type ActionState = { error?: string; success?: string } | null

export async function createDepartment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createDepartmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const user = await requireUser()
  const overrideOrgId = formData.get("orgId") as string | null
  const supabase = await createClient()

  const org = overrideOrgId
    ? (await supabase.from("organizations").select("*").eq("id", overrideOrgId).maybeSingle()).data
    : await getActiveOrg(user)
  if (!org) return { error: "No organization selected." }

  const { error } = await supabase.from("departments").insert({ org_id: org.id, name: parsed.data.name })
  if (error) return { error: error.message }

  revalidatePath("/team")
  revalidatePath("/projects/new")
  return { success: `${parsed.data.name} added.` }
}

export async function assignMemberDepartment(orgMemberId: string, departmentId: string) {
  const supabase = await createClient()
  await supabase.from("org_member_departments").insert({ org_member_id: orgMemberId, department_id: departmentId })
  revalidatePath("/team")
}

export async function removeMemberDepartment(orgMemberId: string, departmentId: string) {
  const supabase = await createClient()
  await supabase
    .from("org_member_departments")
    .delete()
    .eq("org_member_id", orgMemberId)
    .eq("department_id", departmentId)
  revalidatePath("/team")
}
