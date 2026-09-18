import "server-only"

import { cache } from "react"

import { getActiveOrg, requireUser, type CurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { Organization } from "@/types/database"

/**
 * The dashboard, nav and every scoped query key off one of these. They are
 * ordered by reach: a super admin sees every org, a project lead sees their
 * boards and whoever works on them, a client admin sees their whole org, a
 * client sees their departments.
 */
export type ViewerRole = "super_admin" | "project_lead" | "staff" | "client_admin" | "client"

export interface Viewer {
  user: CurrentUser
  org: Organization | null
  role: ViewerRole
  isStaff: boolean
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  /**
   * A "team lead" here is whoever is `lead_id` on at least one project — their
   * team is the people assigned work on those boards, so leadership follows
   * the work rather than a separate org chart.
   */
  isProjectLead: boolean
  ledProjectIds: string[]
}

export const ROLE_LABELS: Record<ViewerRole, string> = {
  super_admin: "Super admin",
  project_lead: "Project lead",
  staff: "Staff",
  client_admin: "Client admin",
  client: "Client",
}

/** Project ids this user leads, across every org they can see. */
export const getLedProjectIds = cache(async (userId: string): Promise<string[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("projects").select("id").eq("lead_id", userId)
  return (data ?? []).map((p) => p.id)
})

/**
 * Resolves who is looking at the page. Request-memoized, so a layout, a page
 * and half a dozen streamed sections can all ask without re-running the
 * queries.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const user = await requireUser()
  const org = await getActiveOrg(user)

  const ledProjectIds = user.isStaff ? await getLedProjectIds(user.id) : []
  const isOrgAdmin = user.memberships.some((m) => m.org.id === org?.id && m.role === "admin")
  const isProjectLead = ledProjectIds.length > 0

  const role: ViewerRole = user.isSuperAdmin
    ? "super_admin"
    : user.isStaff
      ? isProjectLead
        ? "project_lead"
        : "staff"
      : isOrgAdmin
        ? "client_admin"
        : "client"

  return {
    user,
    org,
    role,
    isStaff: user.isStaff,
    isSuperAdmin: user.isSuperAdmin,
    isOrgAdmin: user.isStaff || isOrgAdmin,
    isProjectLead,
    ledProjectIds,
  }
})
