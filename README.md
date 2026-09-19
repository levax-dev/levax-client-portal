# Leverage Axiom Client Portal

A multi-tenant client portal for Leverage Axiom: support tickets, Jira-style project boards, a
knowledge base, and team/account management — one login per client organization.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Supabase
(Postgres, Auth, Storage, RLS) · Resend · deployed on Vercel.

## How it's organized

- **Organizations** are client companies. Each has its own members (`org_members`, role
  `admin`/`member`) and its own data, isolated by Postgres Row Level Security — a client can only
  ever see rows scoped to their org.
- **Staff** (your team, `profiles.platform_role = 'staff' | 'super_admin'`) bypass that scoping and
  can see every organization. They pick which org they're viewing with the org switcher in the top
  bar (`/admin/organizations` to manage orgs directly).
- **Projects need client sign-off.** Staff propose a project; it sits at `approval_status = pending`
  until any member of the client org approves or sends it back with a reason. Approving is routed
  through a `SECURITY DEFINER` function (`decide_project`) rather than a broad UPDATE policy, so the
  right to approve can't be used to rename a project or move its dates.
- **Clients raise tickets; staff raise tasks.** A ticket is a request, categorised as an app
  request, workflow automation, bug report or BI report. A task is the work that answers it — and
  every task carries `parent_ticket_id`, enforced by a check constraint, so all delivery traces back
  to something a client actually asked for. One ticket can spawn many tasks. Clients can read the
  Kanban board and comment on tickets, but the board is read-only to them (enforced in RLS, not just
  the UI).
- **Issues** are a single unified table (`issues`) that powers both support tickets and Kanban work
  items — a `type` column (`ticket` / `task` / `bug` / `feature`) distinguishes them. Every org gets
  an auto-created "Support" project with a ticket-style board (Open → In Progress → Waiting on
  Client → Resolved → Closed); additional projects get a generic board (Backlog → To Do → In
  Progress → In Review → Done).
- **Auth** is Supabase email/password + magic link. There's no public self-signup — client users
  join via an emailed invite link (`/invite/[token]`), and organizations are created by staff
  (`/admin/organizations/new`).

## First-time setup

### 1. Create a Supabase project

Create a new project at [supabase.com](https://supabase.com/dashboard). Grab, from
**Project Settings → API**:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the client)

Copy `.env.example` to `.env.local` and fill these in, plus `NEXT_PUBLIC_APP_URL`
(`http://localhost:3000` for local dev) and `NEXT_PUBLIC_APP_TIMEZONE`.

`NEXT_PUBLIC_APP_TIMEZONE` decides when "today" rolls over on the schedule, dashboard and work log.
It matters: Vercel runs in UTC, so leaving it unset would flip the date mid-morning for a team in
Asia and quietly move work between "due today" and "overdue".

### 2. Run the database migrations

Open the Supabase dashboard's **SQL Editor** and run the files in `supabase/migrations/` **in
order**, `0001_init.sql` first. `0001` creates every table, RLS policy, trigger, and the private
`attachments` storage bucket; the later files add profile fields, departments and project leads,
and then delivery planning (approvals, ticket categories, task lineage, timelines and effort).
(If you use the Supabase CLI instead: `supabase link` then `supabase db push`.)

`0005_delivery_planning.sql` adopts any work items that predate ticket tracking by parenting them
to a root ticket per board, so it is safe to run against an existing database. `0006` adds in-app
project-lead assignment.

### 3. Configure email

By default Supabase's built-in email is heavily rate-limited — fine for local testing, not for
production. For real invite/notification emails, add a [Resend](https://resend.com) API key
(`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) once you've verified a sending domain. Without it, invite
links are just logged to the server console instead of emailed — still fully usable for testing.

For Supabase Auth's own emails (magic link, password reset), set a custom SMTP provider under
**Authentication → Emails** in the Supabase dashboard before going to production.

### 4. Create your first staff account

There's no public signup, so bootstrap yourself manually:

1. Supabase dashboard → **Authentication → Users → Add user**, create yourself with a password
   (check "Auto Confirm User").
2. In the SQL Editor:
   ```sql
   update public.profiles set platform_role = 'staff' where email = 'you@leverageaxiom.com';
   ```
3. Sign in at `/login`. You'll land on an empty dashboard — go to **Organizations → New
   organization** to onboard your first client (this sends them an invite email to set up their
   account).

### 5. Run it

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project settings.
3. Set `NEXT_PUBLIC_APP_URL` to your production domain (used in invite links and email redirects).
4. In Supabase, add your production URL to **Authentication → URL Configuration → Redirect URLs**
   (needed for magic link / password reset to work).

## Customizing the look

The color palette (brand blue + gold, light + dark) is defined as CSS custom properties in
`src/app/globals.css` (`:root` and `.dark` blocks, plus `--brand-blue`/`--brand-gold`/`--brand-gold-ink`).
The logo lives at `public/logo-icon.png` (mark only) and `public/logo-full.png` (full lockup) —
replace those and the sidebar/login-page references in `src/components/layout/app-sidebar.tsx` and
`src/app/(auth)/layout.tsx` if the brand changes.

## The planning views

| Route | Who | What it answers |
|---|---|---|
| `/dashboard` | everyone | Role-aware KPIs. Clients lead with what needs their approval, then what lands today and what has slipped. Staff lead with their own queue and week-vs-capacity; project leads also get untriaged tickets and per-person load. |
| `/schedule` | everyone | Today / this week / this month / custom range, as a table. Clients see what their approved projects will deliver; staff also get "no delivery date set", and leads can flip the whole page between their own queue and their team's, grouped per person. |
| `/work-log` | everyone | What was closed in a period and *what was actually done* — closing a task requires a resolution note, and that note is what the client reads back. |
| `/team-tracking` | project leads | Per-person load against weekly capacity, completion rate, and a per-project breakdown. |

### Project leads

A "team lead" is not a separate role — it is whoever is `projects.lead_id` on at least one project,
and their team is whoever is assigned work on those boards. Leadership follows the work rather than
a parallel org chart.

Leads are assigned in the app, from the **Lead** control on a project's page:

- a **super admin** can set the lead on any project;
- a **project's current lead** can hand that project to another staff member;
- everyone else sees who the lead is, but cannot change it.

Being a lead carries real authority — ticket triage on that board, the team-tracking page, and
visibility of everyone assigned work there — so the rule is enforced in the database by
`assign_project_lead()` plus a trigger, not only in the Server Function. A broad `projects_update`
policy already lets any staff member PATCH a project row through PostgREST, which would otherwise
make the boundary advisory. Creating a project follows the same rule: a regular staff member can take
the lead themselves or leave it open, and a lead must be one of your own staff.

### Effort and capacity

Tasks carry `estimated_hours`; each profile carries `weekly_capacity_hours` (default 40, editable on
the Account page by staff). The meters on the schedule and team-tracking views read planned hours
for the period against that capacity, so "plan for the week" is answerable rather than a task count.

### Attachments

Tickets accept images, video, PDF, Word, Excel, PowerPoint and zip, with per-kind size caps
(`src/lib/uploads.ts`). It is an **allowlist** — anything not named is refused, including `.svg`,
since attachments are served from a signed URL and SVG can carry script. The browser checks first as
a courtesy; the server re-checks every file, because Server Functions are reachable by direct POST.

## What's not built yet

- Billing/invoicing (deferred by design — team/account management ships without it in v1).
- Per-org-private knowledge base articles (the schema supports it via `kb_articles.org_id`, but the
  UI only exposes globally-visible articles for now).
- Real-time live updates (comments/board changes refresh on navigation/action, not via websocket
  push).
- CSV/Excel export of the planning tables, a per-issue audit trail, and click-to-sort columns —
  scoped out of this pass, not blocked by anything.
