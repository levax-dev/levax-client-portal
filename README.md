# Levax Client Portal

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
(`http://localhost:3000` for local dev).

### 2. Run the database migration

Open the Supabase dashboard's **SQL Editor** and run the contents of
`supabase/migrations/0001_init.sql`. It creates every table, RLS policy, trigger, and the private
`attachments` storage bucket. (If you use the Supabase CLI instead: `supabase link` then
`supabase db push`.)

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

The color palette is a placeholder (indigo/slate, light + dark) defined as CSS custom properties in
`src/app/globals.css` (`:root` and `.dark` blocks) — swap in real brand colors any time. Replace the
`Layers` icon and "Levax Portal" text in `src/components/layout/app-sidebar.tsx` with a logo when
you have one.

## What's not built yet

- Billing/invoicing (deferred by design — team/account management ships without it in v1).
- Per-org-private knowledge base articles (the schema supports it via `kb_articles.org_id`, but the
  UI only exposes globally-visible articles for now).
- Real-time live updates (comments/board changes refresh on navigation/action, not via websocket
  push).
