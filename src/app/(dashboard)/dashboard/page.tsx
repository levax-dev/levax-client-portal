import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Book, Building2, KanbanSquare, Ticket as TicketIcon } from "lucide-react"

import { OrgBreakdown, type OrgBreakdownRow } from "@/components/dashboard/org-breakdown"
import { StaffContributions, type StaffContributionRow } from "@/components/dashboard/staff-contributions"
import { PageHeader } from "@/components/page-header"
import { PriorityBadge } from "@/components/priority-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import type { IssuePriority } from "@/types/database"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const user = await requireUser()

  if (user.isStaff) {
    return <StaffDashboard userId={user.id} isSuperAdmin={user.isSuperAdmin} firstName={user.profile.full_name?.split(" ")[0] ?? "there"} />
  }

  const org = await getActiveOrg(user)
  const supabase = await createClient()

  if (!org) {
    return (
      <PageHeader
        title={`Welcome, ${user.profile.full_name ?? "there"}`}
        description="You're not part of an organization yet. Ask your Leverage Axiom contact for an invite."
      />
    )
  }

  const [{ count: openTickets }, { count: myIssues }, { data: recentIssues }, { data: projects }] =
    await Promise.all([
      supabase
        .from("issues")
        .select("id, board_columns!inner(is_done_column)", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("type", "ticket")
        .eq("board_columns.is_done_column", false),
      supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("org_id", org.id)
        .eq("assignee_id", user.id),
      supabase
        .from("issues")
        .select("id, title, priority, type, created_at")
        .eq("org_id", org.id)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("projects")
        .select("id, name, status")
        .eq("org_id", org.id)
        .eq("is_support_project", false)
        .order("created_at", { ascending: false })
        .limit(4),
    ])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user.profile.full_name?.split(" ")[0] ?? "there"}`}
        description={`Here's what's happening at ${org.name}.`}
        actions={
          <Button render={<Link href="/tickets/new" />}>
            <TicketIcon />
            New ticket
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Open tickets" value={openTickets ?? 0} icon={TicketIcon} />
        <StatCard label="Assigned to me" value={myIssues ?? 0} icon={KanbanSquare} />
        <StatCard label="Active projects" value={projects?.length ?? 0} icon={KanbanSquare} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RecentActivity issues={recentIssues ?? []} />

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QuickLink href="/projects" icon={KanbanSquare} label="Browse projects" />
            <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
            <QuickLink href="/tickets/new" icon={TicketIcon} label="Raise a ticket" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function StaffDashboard({
  userId,
  isSuperAdmin,
  firstName,
}: {
  userId: string
  isSuperAdmin: boolean
  firstName: string
}) {
  const supabase = await createClient()

  const [
    { count: openTickets },
    { count: myIssues },
    { count: activeProjects },
    { count: totalTasks },
    { data: recentIssues },
    { data: ticketRows },
    { data: staffProfiles },
  ] = await Promise.all([
    supabase
      .from("issues")
      .select("id, board_columns!inner(is_done_column)", { count: "exact", head: true })
      .eq("type", "ticket")
      .eq("board_columns.is_done_column", false),
    supabase.from("issues").select("id", { count: "exact", head: true }).eq("assignee_id", userId),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("is_support_project", false)
      .eq("status", "active"),
    supabase.from("issues").select("id", { count: "exact", head: true }),
    supabase
      .from("issues")
      .select("id, title, priority, type, created_at, organizations(name)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("issues")
      .select("org_id, organizations(name), board_columns(is_done_column)")
      .eq("type", "ticket"),
    isSuperAdmin
      ? supabase.from("profiles").select("id, full_name, avatar_url").in("platform_role", ["staff", "super_admin"])
      : Promise.resolve({ data: null }),
  ])

  const breakdownMap = new Map<string, OrgBreakdownRow>()
  for (const row of ticketRows ?? []) {
    const org = row.organizations as unknown as { name: string } | null
    const column = row.board_columns as unknown as { is_done_column: boolean } | null
    if (!org) continue
    const existing = breakdownMap.get(row.org_id) ?? {
      orgId: row.org_id,
      orgName: org.name,
      openTickets: 0,
      resolvedTickets: 0,
      totalTickets: 0,
    }
    existing.totalTickets++
    if (column?.is_done_column) existing.resolvedTickets++
    else existing.openTickets++
    breakdownMap.set(row.org_id, existing)
  }
  const orgBreakdown = Array.from(breakdownMap.values()).sort((a, b) => a.orgName.localeCompare(b.orgName))

  let staffContributions: StaffContributionRow[] = []
  if (isSuperAdmin && staffProfiles && staffProfiles.length > 0) {
    const staffIds = staffProfiles.map((p) => p.id)
    const { data: staffIssues } = await supabase
      .from("issues")
      .select("assignee_id, resolved_at")
      .in("assignee_id", staffIds)

    staffContributions = staffProfiles.map((p) => {
      const assigned = staffIssues?.filter((i) => i.assignee_id === p.id) ?? []
      return {
        id: p.id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        assigned: assigned.length,
        resolved: assigned.filter((i) => i.resolved_at).length,
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={isSuperAdmin ? "Here's how things look across every organization." : "Here's what's happening across all your organizations."}
        actions={
          <Button variant="outline" render={<Link href="/admin/organizations" />}>
            <Building2 />
            Manage organizations
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total tasks (all orgs)" value={totalTasks ?? 0} icon={KanbanSquare} />
        <StatCard label="Open tickets (all orgs)" value={openTickets ?? 0} icon={TicketIcon} />
        <StatCard label="Assigned to me" value={myIssues ?? 0} icon={KanbanSquare} />
        <StatCard label="Active projects (all orgs)" value={activeProjects ?? 0} icon={KanbanSquare} />
      </div>

      <OrgBreakdown rows={orgBreakdown} />

      {isSuperAdmin && <StaffContributions rows={staffContributions} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent activity across all orgs</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/tickets" />}>
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentIssues && recentIssues.length > 0 ? (
              recentIssues.map((issue) => {
                const org = issue.organizations as unknown as { name: string } | null
                return (
                  <Link
                    key={issue.id}
                    href={`/tickets/${issue.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{issue.title}</p>
                      {org && <p className="truncate text-xs text-muted-foreground">{org.name}</p>}
                    </div>
                    <PriorityBadge priority={issue.priority} />
                  </Link>
                )
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <QuickLink href="/projects" icon={KanbanSquare} label="Browse projects" />
            <QuickLink href="/knowledge-base" icon={Book} label="Knowledge base" />
            <QuickLink href="/tickets/new" icon={TicketIcon} label="Raise a ticket" />
            <QuickLink href="/admin/organizations" icon={Building2} label="Organizations" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof TicketIcon }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function RecentActivity({
  issues,
}: {
  issues: { id: string; title: string; priority: IssuePriority }[]
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent activity</CardTitle>
        <Button variant="ghost" size="sm" render={<Link href="/tickets" />}>
          View all
          <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/tickets/${issue.id}`}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-accent"
            >
              <span className="truncate text-sm font-medium">{issue.title}</span>
              <PriorityBadge priority={issue.priority} />
            </Link>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </CardContent>
    </Card>
  )
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof TicketIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 text-sm hover:bg-accent">
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  )
}
