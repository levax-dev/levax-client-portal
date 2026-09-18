import Link from "next/link"
import { CalendarRange, KanbanSquare, Plus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { OrgSwitcher } from "@/components/layout/org-switcher"
import { ApprovalQueue } from "@/components/projects/approval-queue"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RateMeter } from "@/components/work/capacity-meter"
import { formatDate } from "@/lib/periods"
import { getProjectsAwaitingDecision } from "@/lib/queries/work"
import { getViewer } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"

export async function ProjectsListSection({ orgParam }: { orgParam?: string }) {
  const viewer = await getViewer()
  const supabase = await createClient()

  let org = viewer.org
  let organizations: { id: string; name: string }[] | null = null

  if (viewer.isStaff) {
    const [{ data: allOrgs }, { data: paramOrg }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      orgParam
        ? supabase.from("organizations").select("*").eq("id", orgParam).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    organizations = allOrgs
    if (paramOrg) org = paramOrg
  }

  const [{ data: projects }, awaiting, { data: issueRows }] = await Promise.all([
    org
      ? supabase
          .from("projects")
          .select(
            `id, name, description, status, approval_status, target_date,
             lead:profiles!projects_lead_id_fkey(id, full_name)`
          )
          .eq("org_id", org.id)
          .eq("is_support_project", false)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    org
      ? getProjectsAwaitingDecision(supabase, org.id, ["pending", "rejected"])
      : Promise.resolve([]),
    org
      ? supabase.from("issues").select("project_id, resolved_at").eq("org_id", org.id)
      : Promise.resolve({ data: [] }),
  ])

  // Progress per board, derived from one pass rather than a count query each.
  const progress = new Map<string, { total: number; done: number }>()
  for (const row of issueRows ?? []) {
    const entry = progress.get(row.project_id) ?? { total: 0, done: 0 }
    entry.total++
    if (row.resolved_at) entry.done++
    progress.set(row.project_id, entry)
  }

  const canCreate = viewer.isStaff || viewer.isOrgAdmin

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {viewer.isStaff && organizations ? (
          <OrgSwitcher organizations={organizations} activeOrgId={org?.id ?? null} />
        ) : (
          <div />
        )}
        {canCreate && (
          <Button render={<Link href="/projects/new" />}>
            <Plus />
            {viewer.isStaff ? "Propose project" : "New project"}
          </Button>
        )}
      </div>

      {awaiting.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Awaiting your approval
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {awaiting.length} pending
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {viewer.isStaff
                ? "Proposed to this client — work starts once they approve."
                : "Nothing is worked on until you approve it."}
            </p>
          </div>
          <ApprovalQueue
            projects={awaiting}
            canDecide={!viewer.isStaff}
            showOrg={viewer.isStaff}
          />
        </section>
      )}

      <section className="space-y-3">
        {awaiting.length > 0 && (
          <h2 className="text-lg font-semibold tracking-tight">Active projects</h2>
        )}

        {!projects || projects.length === 0 ? (
          <EmptyState
            icon={KanbanSquare}
            title="No approved projects yet"
            description={
              awaiting.length > 0
                ? "Approve a request above and its board opens up here."
                : "Create a project to start tracking work on a board."
            }
            action={
              canCreate &&
              awaiting.length === 0 && (
                <Button render={<Link href="/projects/new" />}>
                  <Plus />
                  New project
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const counts = progress.get(project.id) ?? { total: 0, done: 0 }
              const lead = project.lead as unknown as { full_name: string | null } | null
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="h-full transition-colors hover:bg-accent/50">
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="secondary" className="shrink-0 capitalize">
                        {project.status.replace("_", " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                      <RateMeter
                        percent={counts.total === 0 ? 0 : (counts.done / counts.total) * 100}
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {counts.done}/{counts.total} done
                        </span>
                        {project.target_date && (
                          <span className="flex items-center gap-1">
                            <CalendarRange className="size-3" />
                            {formatDate(project.target_date)}
                          </span>
                        )}
                        {lead?.full_name && <span>Lead: {lead.full_name}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
