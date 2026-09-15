// Backfills departments onto the existing demo data seeded by seed-demo.mjs,
// now that departments/project-leads exist. For each client org this creates
// an "Operations" department (mapped to the custom Kanban project) and an
// "IT Support" department (mapped to the Support project), assigns the demo
// contacts into them, sets a project lead on the custom project, and
// backfills department_id onto existing issues/tickets so non-admin demo
// members still see their tickets under the new department-scoped RLS.
// Safe to re-run — every step is idempotent.
//
// Usage: node --env-file=.env.local scripts/seed-departments.mjs

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const STAFF_EMAIL = "chris@leverageaxiom.com"

function must(result, label) {
  if (result.error) {
    console.error(`✗ ${label}:`, result.error.message)
    process.exit(1)
  }
  return result.data
}

async function ensureDepartment(orgId, name) {
  const { data: existing } = await supabase.from("departments").select("id").eq("org_id", orgId).eq("name", name).maybeSingle()
  if (existing) return existing.id
  const dept = must(
    await supabase.from("departments").insert({ org_id: orgId, name }).select("id").single(),
    `create department ${name}`
  )
  console.log(`✓ department created: ${name}`)
  return dept.id
}

async function ensureProjectDepartment(projectId, deptId) {
  const { data: existing } = await supabase
    .from("project_departments")
    .select("id")
    .eq("project_id", projectId)
    .eq("department_id", deptId)
    .maybeSingle()
  if (existing) return
  await supabase.from("project_departments").insert({ project_id: projectId, department_id: deptId })
}

async function ensureMemberDepartment(orgMemberId, deptId) {
  const { data: existing } = await supabase
    .from("org_member_departments")
    .select("id")
    .eq("org_member_id", orgMemberId)
    .eq("department_id", deptId)
    .maybeSingle()
  if (existing) return
  await supabase.from("org_member_departments").insert({ org_member_id: orgMemberId, department_id: deptId })
}

async function setProjectLead(projectId, leadId) {
  await supabase.from("projects").update({ lead_id: leadId }).eq("id", projectId).is("lead_id", null)
}

async function backfillIssueDepartments(projectId, deptId) {
  await supabase.from("issues").update({ department_id: deptId }).eq("project_id", projectId).is("department_id", null)
}

async function getOrgMemberId(orgId, userId) {
  const { data } = await supabase.from("org_members").select("id").eq("org_id", orgId).eq("user_id", userId).maybeSingle()
  return data?.id ?? null
}

async function main() {
  console.log("Backfilling departments onto demo data…\n")

  const { data: staffProfile } = await supabase.from("profiles").select("id").eq("email", STAFF_EMAIL).single()
  if (!staffProfile) {
    console.error(`Staff profile not found for ${STAFF_EMAIL} — run scripts/seed-demo.mjs first.`)
    process.exit(1)
  }
  const STAFF_ID = staffProfile.id

  const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const usersByEmail = new Map((userList?.users ?? []).map((u) => [u.email, u]))

  const clientOrgSpecs = [
    {
      slug: "kec-engineering",
      customProjectName: "Purchase Management System",
      adminEmail: "priya.sharma@kec-demo.com",
      memberEmail: "arjun.mehta@kec-demo.com",
    },
    {
      slug: "murugan-textiles",
      customProjectName: "Procurement & Indent Portal",
      adminEmail: "karthik.raman@murugantextiles-demo.com",
    },
    {
      slug: "dingli-india",
      customProjectName: "Dealer Portal Enhancements",
      adminEmail: "ritesh.kumar@dingli-demo.com",
    },
    {
      slug: "mt-and-t",
      customProjectName: "Product Catalog Migration",
      adminEmail: "sanjay.patel@mtandt-demo.com",
    },
  ]

  for (const spec of clientOrgSpecs) {
    const { data: org } = await supabase.from("organizations").select("id").eq("slug", spec.slug).maybeSingle()
    if (!org) {
      console.log(`= skipping ${spec.slug}: org not found (run seed-demo.mjs first)`)
      continue
    }
    const orgId = org.id

    const opsDeptId = await ensureDepartment(orgId, "Operations")
    const supportDeptId = await ensureDepartment(orgId, "IT Support")

    const { data: customProject } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", spec.customProjectName)
      .maybeSingle()
    if (customProject) {
      await ensureProjectDepartment(customProject.id, opsDeptId)
      await setProjectLead(customProject.id, STAFF_ID)
      await backfillIssueDepartments(customProject.id, opsDeptId)
    }

    const { data: supportProject } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", orgId)
      .eq("is_support_project", true)
      .maybeSingle()
    if (supportProject) {
      await ensureProjectDepartment(supportProject.id, supportDeptId)
      await backfillIssueDepartments(supportProject.id, supportDeptId)
    }

    const adminUser = usersByEmail.get(spec.adminEmail)
    if (adminUser) {
      const memberId = await getOrgMemberId(orgId, adminUser.id)
      if (memberId) {
        await ensureMemberDepartment(memberId, opsDeptId)
        await ensureMemberDepartment(memberId, supportDeptId)
      }
    }

    if (spec.memberEmail) {
      const memberUser = usersByEmail.get(spec.memberEmail)
      if (memberUser) {
        const memberId = await getOrgMemberId(orgId, memberUser.id)
        if (memberId) await ensureMemberDepartment(memberId, supportDeptId)
      }
    }

    console.log(`✓ departments wired for ${spec.slug} (Operations, IT Support)`)
  }

  console.log("\nDone.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
