// Seeds realistic demo data: Leverage Axiom (assigns the staff account as a
// member) plus four client organizations, each with a Support project full of
// tickets across every stage, a custom Kanban project, a couple of comment
// threads (including an internal note), one pending invite, and a knowledge
// base. Safe to re-run against an empty-of-demo-data project; it does not
// delete anything first.
//
// Usage: node --env-file=.env.local scripts/seed-demo.mjs

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment.")
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const STAFF_EMAIL = "chris@leverageaxiom.com"
const DEMO_PASSWORD = "Demo1234!"

function must(result, label) {
  if (result.error) {
    console.error(`✗ ${label}:`, result.error.message)
    process.exit(1)
  }
  return result.data
}

async function upsertOrg(name, slug) {
  const { data: existing } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle()
  if (existing) {
    console.log(`= org exists: ${name}`)
    return existing.id
  }
  const org = must(
    await supabase.from("organizations").insert({ name, slug }).select("id").single(),
    `create org ${name}`
  )
  console.log(`✓ org created: ${name}`)
  return org.id
}

// Support boards used to be created by a trigger on `organizations`; migration
// 0004 dropped it so staff choose a project's departments explicitly. The seed
// therefore has to create the board itself when an org doesn't have one.
const SUPPORT_COLUMNS = [
  { name: "Open", position: 0, color: "#3b82f6", is_done_column: false },
  { name: "In Progress", position: 1, color: "#f59e0b", is_done_column: false },
  { name: "Waiting on Client", position: 2, color: "#a855f7", is_done_column: false },
  { name: "Resolved", position: 3, color: "#22c55e", is_done_column: true },
  { name: "Closed", position: 4, color: "#64748b", is_done_column: true },
]

async function getSupportProject(orgId) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_support_project", true)
    .maybeSingle()

  let projectId = existing?.id
  if (!projectId) {
    const project = must(
      await supabase
        .from("projects")
        .insert({
          org_id: orgId,
          name: "Support",
          description: "Support tickets and requests",
          is_support_project: true,
          status: "active",
        })
        .select("id")
        .single(),
      "create support project"
    )
    projectId = project.id
    must(
      await supabase
        .from("board_columns")
        .insert(SUPPORT_COLUMNS.map((c) => ({ ...c, project_id: projectId }))),
      "seed support columns"
    )
    console.log("✓ support project created")
  }

  const columns = must(
    await supabase.from("board_columns").select("id, name, position").eq("project_id", projectId).order("position"),
    "fetch support columns"
  )
  return { projectId, columns }
}

async function createCustomProject(orgId, name, description) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", name)
    .maybeSingle()
  if (existing) {
    const columns = must(
      await supabase.from("board_columns").select("id, name, position").eq("project_id", existing.id).order("position"),
      "fetch existing custom columns"
    )
    console.log(`= project exists: ${name}`)
    return { projectId: existing.id, columns }
  }
  const project = must(
    await supabase.from("projects").insert({ org_id: orgId, name, description }).select("id").single(),
    `create project ${name}`
  )
  must(await supabase.rpc("seed_default_columns", { p_project_id: project.id }), "seed default columns")
  const columns = must(
    await supabase.from("board_columns").select("id, name, position").eq("project_id", project.id).order("position"),
    "fetch new custom columns"
  )
  console.log(`✓ project created: ${name}`)
  return { projectId: project.id, columns }
}

/**
 * A project proposed but not yet signed off, so the client's approval queue
 * has something in it on first login. Gets a board like any other — it just
 * can't be worked until someone at the org approves.
 */
async function createPendingProject(orgId, name, description, requestedBy, leadId) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("org_id", orgId)
    .eq("name", name)
    .maybeSingle()
  if (existing) {
    console.log(`= pending project exists: ${name}`)
    return existing.id
  }

  const project = must(
    await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        name,
        description,
        approval_status: "pending",
        status: "on_hold",
        created_by: requestedBy,
        requested_by: requestedBy,
        lead_id: leadId,
        start_date: dateFromToday(7),
        target_date: dateFromToday(45),
      })
      .select("id")
      .single(),
    `create pending project ${name}`
  )
  must(await supabase.rpc("seed_default_columns", { p_project_id: project.id }), "seed pending columns")

  // Attach every department the org has, so members can see it to approve it.
  const { data: departments } = await supabase.from("departments").select("id").eq("org_id", orgId)
  if (departments?.length) {
    await supabase
      .from("project_departments")
      .insert(departments.map((d) => ({ project_id: project.id, department_id: d.id })))
  }

  console.log(`✓ pending project created: ${name}`)
  return project.id
}

async function ensureContact(email, fullName) {
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const found = list?.users?.find((u) => u.email === email)
  if (found) {
    console.log(`= contact exists: ${fullName}`)
    return found.id
  }
  const created = must(
    await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
    `create contact ${fullName}`
  )
  console.log(`✓ contact created: ${fullName} <${email}>`)
  return created.user.id
}

async function ensureMember(orgId, userId, role) {
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) return
  must(await supabase.from("org_members").insert({ org_id: orgId, user_id: userId, role }), "add org member")
}

async function createIssue({
  orgId,
  projectId,
  columnId,
  type,
  title,
  description,
  priority,
  reporterId,
  assigneeId,
  position,
  resolved,
  category = null,
  parentTicketId = null,
  startDate = null,
  dueDate = null,
  estimatedHours = null,
  resolutionNote = null,
}) {
  const { data: existing } = await supabase
    .from("issues")
    .select("id")
    .eq("project_id", projectId)
    .eq("title", title)
    .maybeSingle()
  if (existing) return existing.id

  const issue = must(
    await supabase
      .from("issues")
      .insert({
        org_id: orgId,
        project_id: projectId,
        column_id: columnId,
        type,
        category,
        // Every task traces back to a ticket — a database constraint, not a
        // convention, so the seed has to create tickets before tasks.
        parent_ticket_id: parentTicketId,
        title,
        description,
        priority,
        reporter_id: reporterId,
        assignee_id: assigneeId,
        position,
        start_date: startDate,
        due_date: dueDate,
        estimated_hours: estimatedHours,
        resolution_note: resolved ? resolutionNote : null,
        resolved_at: resolved ? new Date().toISOString() : null,
      })
      .select("id")
      .single(),
    `create issue ${title}`
  )
  return issue.id
}

/** Plain `YYYY-MM-DD`, `offset` days from today. */
function dateFromToday(offset) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

/**
 * A delivery timeline per board column, chosen so the seeded data exercises
 * every state the planning views care about: undated backlog, due today,
 * upcoming, overdue, and delivered.
 */
const SCHEDULE_BY_COLUMN = [
  { start: null, due: null, hours: null }, // Backlog — no timeline yet
  { start: dateFromToday(-1), due: dateFromToday(0), hours: 6 }, // To Do — lands today
  { start: dateFromToday(-2), due: dateFromToday(2), hours: 12 }, // In Progress — this week
  { start: dateFromToday(-8), due: dateFromToday(-3), hours: 8 }, // In Review — overdue
  { start: dateFromToday(-12), due: dateFromToday(-5), hours: 10 }, // Done
]

const SEED_CATEGORIES = ["app_request", "bug_report", "workflow_automation", "bi_report", "other"]

async function addComment(issueId, authorId, body, isInternal = false) {
  await supabase.from("issue_comments").insert({ issue_id: issueId, author_id: authorId, body, is_internal: isInternal })
}

async function main() {
  console.log("Seeding demo data…\n")

  const { data: staffProfile } = await supabase.from("profiles").select("id").eq("email", STAFF_EMAIL).single()
  if (!staffProfile) {
    console.error(`Staff profile not found for ${STAFF_EMAIL} — create that account first.`)
    process.exit(1)
  }
  const STAFF_ID = staffProfile.id

  // ── Organizations ─────────────────────────────────────────────────────
  const orgSpecs = [
    { slug: "leverage-axiom", name: "Leverage Axiom" },
    { slug: "kec-engineering", name: "KEC Engineering" },
    { slug: "murugan-textiles", name: "Murugan Textiles" },
    { slug: "dingli-india", name: "Dingli India" },
    { slug: "mt-and-t", name: "MT & T Distribution" },
  ]
  const orgIds = {}
  for (const spec of orgSpecs) {
    orgIds[spec.slug] = await upsertOrg(spec.name, spec.slug)
  }

  // Assign the staff account into Leverage Axiom as an org admin.
  await ensureMember(orgIds["leverage-axiom"], STAFF_ID, "admin")
  console.log(`✓ ${STAFF_EMAIL} assigned to Leverage Axiom org\n`)

  // ── Client contacts ──────────────────────────────────────────────────
  const contacts = {}
  contacts["kec-engineering"] = {
    admin: await ensureContact("priya.sharma@kec-demo.com", "Priya Sharma"),
  }
  await ensureMember(orgIds["kec-engineering"], contacts["kec-engineering"].admin, "admin")
  const kecMember = await ensureContact("arjun.mehta@kec-demo.com", "Arjun Mehta")
  await ensureMember(orgIds["kec-engineering"], kecMember, "member")

  contacts["murugan-textiles"] = {
    admin: await ensureContact("karthik.raman@murugantextiles-demo.com", "Karthik Raman"),
  }
  await ensureMember(orgIds["murugan-textiles"], contacts["murugan-textiles"].admin, "admin")

  contacts["dingli-india"] = {
    admin: await ensureContact("ritesh.kumar@dingli-demo.com", "Ritesh Kumar"),
  }
  await ensureMember(orgIds["dingli-india"], contacts["dingli-india"].admin, "admin")

  contacts["mt-and-t"] = {
    admin: await ensureContact("sanjay.patel@mtandt-demo.com", "Sanjay Patel"),
  }
  await ensureMember(orgIds["mt-and-t"], contacts["mt-and-t"].admin, "admin")
  contacts["leverage-axiom"] = { admin: STAFF_ID }
  console.log("")

  // One pending invite, for realism on the Team page.
  const { data: pendingInvite } = await supabase
    .from("org_invites")
    .select("id")
    .eq("org_id", orgIds["mt-and-t"])
    .eq("email", "anita.verma@mtandt-demo.com")
    .maybeSingle()
  if (!pendingInvite) {
    await supabase.from("org_invites").insert({
      org_id: orgIds["mt-and-t"],
      email: "anita.verma@mtandt-demo.com",
      role: "member",
      invited_by: STAFF_ID,
    })
    console.log("✓ pending invite created: anita.verma@mtandt-demo.com\n")
  }

  // ── Custom projects + tickets per org ───────────────────────────────
  const projectSpecs = {
    "leverage-axiom": {
      name: "Internal Ops & Tooling",
      description: "Internal tooling and operations for the agency itself.",
      issues: [
        ["Migrate internal wiki to new platform", "task", "medium", 0, false],
        ["Set up automated backup for client Supabase projects", "task", "high", 1, false],
        ["Design updated pitch deck template", "task", "low", 2, true],
        ["Audit client data retention policy", "task", "high", 3, true],
        ["Onboarding checklist automation", "feature", "medium", 4, true],
      ],
      tickets: [
        ["Set up VPN access for new hire", "low", 0, false, false],
        ["Invoice template needs updated logo", "medium", 1, true, false],
        ["Website contact form not sending emails", "high", 2, true, false],
        ["Renew domain SSL certificate", "urgent", 3, true, true],
        ["Add team calendar sync to internal tools", "low", 4, true, true],
      ],
    },
    "kec-engineering": {
      name: "Purchase Management System",
      description: "Multi-level purchase approval and indent tracking platform.",
      issues: [
        ["Implement multi-level approval matrix", "feature", "high", 0, false],
        ["Fix currency rounding in PO totals", "bug", "high", 1, false],
        ["Add vendor rating field", "feature", "low", 2, true],
        ["Build purchase requisition mobile view", "feature", "medium", 3, true],
        ["Migrate legacy indent data", "task", "medium", 4, true],
      ],
      tickets: [
        ["Approval workflow stuck on multi-level indent", "urgent", 0, false, false],
        ["Vendor GST number validation failing on purchase order", "high", 1, true, false],
        ["Need bulk upload for purchase requisitions", "medium", 2, true, false],
        ["Dashboard totals don't match ledger export", "high", 3, true, true],
        ["Add SMS alert when PO is approved", "low", 4, true, true],
      ],
    },
    "murugan-textiles": {
      name: "Procurement & Indent Portal",
      description: "Vendor management, indents, and compliance tracking for procurement.",
      issues: [
        ["Build vendor compliance dashboard", "feature", "medium", 0, false],
        ["Add barcode scanning for item master", "feature", "low", 1, false],
        ["Automate monthly procurement report", "task", "medium", 2, true],
        ["Fix indent approval email template", "bug", "high", 3, true],
        ["Data migration from legacy indent sheets", "task", "high", 4, true],
      ],
      tickets: [
        ["Indent list not filtering by department", "medium", 0, false, false],
        ["Compliance report missing signatures column", "high", 1, true, false],
        ["Can't attach fabric swatch images to indent", "medium", 2, true, false],
        ["Vendor master search is slow", "low", 3, true, true],
        ["Add re-order point alerts for yarn stock", "medium", 4, true, true],
      ],
    },
    "dingli-india": {
      name: "Dealer Portal Enhancements",
      description: "Ongoing improvements to the dealer stock, invoicing, and service portal.",
      issues: [
        ["Build dealer onboarding checklist", "feature", "medium", 0, false],
        ["Add multi-warehouse stock view", "feature", "high", 1, false],
        ["Improve invoice PDF generation speed", "bug", "high", 2, true],
        ["Service request SLA tracking", "feature", "medium", 3, true],
        ["Dealer performance leaderboard", "feature", "low", 4, true],
      ],
      tickets: [
        ["Dealer stock sync delayed by a day", "high", 0, false, false],
        ["Invoice PDF shows wrong GSTIN", "urgent", 1, true, false],
        ["Ledger running balance incorrect after credit note", "high", 2, true, false],
        ["Service request status not updating for technician", "medium", 3, true, true],
        ["Add catalog download tracking", "low", 4, true, true],
      ],
    },
    "mt-and-t": {
      name: "Product Catalog Migration",
      description: "Merging and cleaning up the product catalogue across legacy exports.",
      issues: [
        ["Finish custom products catalogue merge", "task", "high", 0, false],
        ["Build SKU de-duplication tool", "feature", "high", 1, false],
        ["Map legacy categories to new taxonomy", "task", "medium", 2, true],
        ["QA frontend catalogue against master", "task", "medium", 3, true],
        ["Archive old product export scripts", "task", "low", 4, true],
      ],
      tickets: [
        ["Product images missing after catalog import", "high", 0, false, false],
        ["Duplicate SKUs showing in frontend catalogue", "urgent", 1, true, false],
        ["Price mismatch between master and frontend export", "high", 2, true, false],
        ["Category mapping broken for custom products", "medium", 3, true, true],
        ["Need CSV export with all product attributes", "low", 4, true, true],
      ],
    },
  }

  const notificationCandidates = []

  for (const [slug, spec] of Object.entries(projectSpecs)) {
    const orgId = orgIds[slug]
    const reporterId = contacts[slug].admin

    // Tickets first: a task can't exist without the request behind it.
    const { projectId: supportProjectId, columns: supportColumns } = await getSupportProject(orgId)
    const ticketIds = []
    for (const [index, [title, priority, colIdx, assignToStaff, resolved]] of spec.tickets.entries()) {
      const id = await createIssue({
        orgId,
        projectId: supportProjectId,
        columnId: supportColumns[colIdx].id,
        type: "ticket",
        category: SEED_CATEGORIES[index % SEED_CATEGORIES.length],
        title,
        description: `${title}. Reported via the client portal.`,
        priority,
        reporterId,
        assigneeId: assignToStaff ? STAFF_ID : null,
        position: colIdx,
        resolved,
        resolutionNote: `Investigated and closed out. ${title.toLowerCase()} is no longer reproducible.`,
      })
      ticketIds.push({ id, colIdx, title })
    }

    const { projectId, columns } = await createCustomProject(orgId, spec.name, spec.description)
    for (const [index, [title, type, priority, colIdx, assignToStaff]] of spec.issues.entries()) {
      const schedule = SCHEDULE_BY_COLUMN[colIdx] ?? SCHEDULE_BY_COLUMN[0]
      const rootTicket = ticketIds[index % ticketIds.length]
      await createIssue({
        orgId,
        projectId,
        columnId: columns[colIdx].id,
        type,
        category: SEED_CATEGORIES[index % SEED_CATEGORIES.length],
        parentTicketId: rootTicket.id,
        title,
        description: `${title}.`,
        priority,
        reporterId: STAFF_ID,
        assigneeId: assignToStaff ? STAFF_ID : null,
        position: colIdx,
        startDate: schedule.start,
        dueDate: schedule.due,
        estimatedHours: schedule.hours,
        resolved: columns[colIdx].name === "Done",
        resolutionNote: `Shipped. ${title} completed and verified against the original request.`,
      })
    }

    // Comment thread on the "In Progress" ticket (index 1)
    const inProgress = ticketIds.find((t) => t.colIdx === 1)
    if (inProgress) {
      await addComment(inProgress.id, reporterId, "Any update on this? It's blocking us this week.")
      await addComment(inProgress.id, STAFF_ID, "Looking into it now — will have a fix out shortly.")
      notificationCandidates.push({
        title: `New comment on "${inProgress.title}"`,
        body: `${slug} replied on their ticket.`,
        link: `/tickets/${inProgress.id}`,
      })
    }

    // Comment thread + internal note on the "Resolved" ticket (index 3)
    const resolved = ticketIds.find((t) => t.colIdx === 3)
    if (resolved) {
      await addComment(resolved.id, reporterId, "Still seeing this on our end, can you take another look?")
      await addComment(resolved.id, STAFF_ID, "Root cause confirmed — deployed a fix in the latest release.", true)
      await addComment(resolved.id, STAFF_ID, "This should be resolved now — please confirm on your end when you get a chance.")
      notificationCandidates.push({
        title: `Ticket resolved: "${resolved.title}"`,
        body: `Marked as resolved.`,
        link: `/tickets/${resolved.id}`,
      })
    }

    const openTicket = ticketIds.find((t) => t.colIdx === 0)
    if (openTicket) {
      notificationCandidates.push({
        title: `New ticket: "${openTicket.title}"`,
        body: `Raised by ${slug}.`,
        link: `/tickets/${openTicket.id}`,
      })
    }

    await createPendingProject(
      orgId,
      `${spec.name} — Phase 2`,
      "Proposed follow-on scope. Waiting on your approval before we start.",
      STAFF_ID,
      STAFF_ID
    )

    console.log(`✓ seeded ${spec.issues.length} project issues + ${spec.tickets.length} tickets for ${spec.name}`)
  }

  // ── Notifications for the staff account ─────────────────────────────
  console.log("")
  let i = 0
  for (const n of notificationCandidates) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", STAFF_ID)
      .eq("title", n.title)
      .maybeSingle()
    if (existing) continue
    await supabase.from("notifications").insert({
      user_id: STAFF_ID,
      type: "ticket_activity",
      title: n.title,
      body: n.body,
      link: n.link,
      is_read: i % 3 === 0,
    })
    i++
  }
  console.log(`✓ seeded ${notificationCandidates.length} notifications\n`)

  // ── Knowledge base ───────────────────────────────────────────────────
  const kbSpecs = [
    {
      name: "Getting Started",
      slug: "getting-started",
      articles: [
        {
          title: "Welcome to the Leverage Axiom Client Portal",
          slug: "welcome-to-levax",
          excerpt: "A quick tour of what you can do here.",
          content:
            "# Welcome\n\nThe Leverage Axiom Client Portal is where you raise support tickets, track project work on a Kanban board, and find answers in our knowledge base — all in one place.\n\n## What you can do\n\n- **Raise tickets** for anything you need help with\n- **Track projects** on a visual board\n- **Invite your team** so everyone stays in the loop\n- **Search this knowledge base** before opening a ticket — you might find your answer already here\n\nIf you get stuck, just raise a ticket and we'll take it from there.",
        },
        {
          title: "Signing in for the first time",
          slug: "signing-in-first-time",
          excerpt: "How to accept your invite and set up your account.",
          content:
            "# Signing in for the first time\n\nYou'll receive an email invite with a link to `/invite/...`. Open it, set a password, and you're in.\n\nPrefer not to remember a password? Use **magic link** sign-in from the login page instead — we'll email you a one-time link.\n\nForgot your password later? Use **Forgot password** on the sign-in page.",
        },
      ],
    },
    {
      name: "Projects & Tickets",
      slug: "projects-and-tickets",
      articles: [
        {
          title: "How to raise a support ticket",
          slug: "how-to-raise-a-ticket",
          excerpt: "Get help fast by giving us the right details up front.",
          content:
            "# How to raise a support ticket\n\nGo to **Tickets → New ticket** and tell us:\n\n1. A clear subject line\n2. What you expected to happen vs. what actually happened\n3. Steps to reproduce, if it's a bug\n4. Any screenshots or files (you can attach these after creating the ticket)\n\nWe'll pick it up and keep you updated right in the ticket thread.",
        },
        {
          title: "Understanding ticket priorities",
          slug: "understanding-ticket-priorities",
          excerpt: "What Low, Medium, High, and Urgent actually mean.",
          content:
            "# Understanding ticket priorities\n\n- **Urgent** — something is broken and blocking your work right now\n- **High** — a real problem, but you have a workaround for today\n- **Medium** — should be fixed soon, not blocking\n- **Low** — nice to have, no rush\n\nPick the priority that best matches impact, not just urgency to you personally — it helps us triage fairly across all clients.",
        },
        {
          title: "Tracking your project on the Kanban board",
          slug: "tracking-project-kanban-board",
          excerpt: "Reading the board and understanding what each column means.",
          content:
            "# Tracking your project on the Kanban board\n\nEach project gets its own board with columns like **Backlog → To Do → In Progress → In Review → Done**. Cards move left to right as work progresses.\n\nClick any card to see full details, comments, and who's assigned. You'll get a notification whenever something you're watching changes.",
        },
      ],
    },
    {
      name: "Account & Team",
      slug: "account-and-team",
      articles: [
        {
          title: "Inviting teammates to your organization",
          slug: "inviting-teammates",
          excerpt: "Add colleagues so they can raise tickets and see project status too.",
          content:
            "# Inviting teammates\n\nIf you're an org admin, go to **Team → Invite member**, enter their email, and choose a role:\n\n- **Admin** — can invite/remove members and manage org settings\n- **Member** — can raise tickets and view projects, can't manage the team\n\nThey'll get an email invite to set up their account.",
        },
        {
          title: "Managing your profile",
          slug: "managing-your-profile",
          excerpt: "Update your name, contact details, and organization info.",
          content:
            "# Managing your profile\n\nGo to **Account** to update your name, phone, job title, and a short bio. Org admins can also update the organization's display name from the same page.",
        },
      ],
    },
  ]

  for (const cat of kbSpecs) {
    const { data: existingCat } = await supabase.from("kb_categories").select("id").eq("slug", cat.slug).maybeSingle()
    let categoryId = existingCat?.id
    if (!categoryId) {
      const created = must(
        await supabase.from("kb_categories").insert({ name: cat.name, slug: cat.slug }).select("id").single(),
        `create kb category ${cat.name}`
      )
      categoryId = created.id
      console.log(`✓ kb category created: ${cat.name}`)
    }
    for (const article of cat.articles) {
      const { data: existingArticle } = await supabase
        .from("kb_articles")
        .select("id")
        .eq("slug", article.slug)
        .maybeSingle()
      if (existingArticle) continue
      await supabase.from("kb_articles").insert({
        category_id: categoryId,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        is_published: true,
        author_id: STAFF_ID,
      })
    }
  }
  console.log("✓ knowledge base seeded\n")

  console.log("Done. Demo contact accounts (password for all: " + DEMO_PASSWORD + "):")
  console.log("  priya.sharma@kec-demo.com          (KEC Engineering, admin)")
  console.log("  arjun.mehta@kec-demo.com            (KEC Engineering, member)")
  console.log("  karthik.raman@murugantextiles-demo.com (Murugan Textiles, admin)")
  console.log("  ritesh.kumar@dingli-demo.com        (Dingli India, admin)")
  console.log("  sanjay.patel@mtandt-demo.com         (MT & T Distribution, admin)")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
