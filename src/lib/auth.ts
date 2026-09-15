import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { OrgRole, Organization, Profile } from "@/types/database"

export const ACTIVE_ORG_COOKIE = "leverage_axiom_active_org"

export interface CurrentUser {
  id: string
  email: string
  profile: Profile
  isStaff: boolean
  isSuperAdmin: boolean
  memberships: { org: Organization; role: OrgRole }[]
}

/**
 * Loads the signed-in user's profile and org memberships. Redirects to
 * /login if unauthenticated. Wrapped in React's `cache()` so the layout and
 * every page that calls this within the same request share one result
 * instead of each re-running the auth check and two queries from scratch.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const [{ data: profile }, { data: memberRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("org_members").select("role, organizations(*)").eq("user_id", user.id),
  ])

  if (!profile) redirect("/login")

  const isSuperAdmin = profile.platform_role === "super_admin"
  const isStaff = isSuperAdmin || profile.platform_role === "staff"

  const memberships = (memberRows ?? [])
    .filter((row) => row.organizations)
    .map((row) => ({
      org: row.organizations as unknown as Organization,
      role: row.role as OrgRole,
    }))

  return { id: user.id, email: user.email ?? profile.email, profile, isStaff, isSuperAdmin, memberships }
})

/**
 * Resolves which organization the current request should be scoped to.
 * Client users are scoped to their (usually only) org; staff pick one via
 * the org switcher, persisted in a cookie, defaulting to the first org.
 * Also request-memoized — layout and page both call this.
 */
export const getActiveOrg = cache(async (current: CurrentUser): Promise<Organization | null> => {
  if (!current.isStaff) {
    return current.memberships[0]?.org ?? null
  }

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value

  const supabase = await createClient()

  if (activeOrgId) {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", activeOrgId)
      .maybeSingle()
    if (data) return data
  }

  const { data: firstOrg } = await supabase
    .from("organizations")
    .select("*")
    .order("name")
    .limit(1)
    .maybeSingle()

  return firstOrg ?? null
})

export async function requireOrgAdmin(current: CurrentUser, orgId: string) {
  if (current.isStaff) return
  const membership = current.memberships.find((m) => m.org.id === orgId)
  if (!membership || membership.role !== "admin") redirect("/dashboard")
}
