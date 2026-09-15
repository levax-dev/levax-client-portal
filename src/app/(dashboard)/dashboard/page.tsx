import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Book, KanbanSquare, Ticket as TicketIcon } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { PriorityBadge } from "@/components/priority-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const user = await requireUser()
  const org = await getActiveOrg(user)
  const supabase = await createClient()

  if (!org) {
    return (
      <PageHeader
        title={`Welcome, ${user.profile.full_name ?? "there"}`}
        description="You're not part of an organization yet. Ask your Levax contact for an invite."
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open tickets</CardTitle>
            <TicketIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{openTickets ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned to me</CardTitle>
            <KanbanSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{myIssues ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active projects</CardTitle>
            <KanbanSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projects?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/tickets" />}>
              View all
              <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentIssues && recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Link
              href="/projects"
              className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 text-sm hover:bg-accent"
            >
              <KanbanSquare className="size-4 text-muted-foreground" />
              Browse projects
            </Link>
            <Link
              href="/knowledge-base"
              className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 text-sm hover:bg-accent"
            >
              <Book className="size-4 text-muted-foreground" />
              Knowledge base
            </Link>
            <Link
              href="/tickets/new"
              className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 text-sm hover:bg-accent"
            >
              <TicketIcon className="size-4 text-muted-foreground" />
              Raise a ticket
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
