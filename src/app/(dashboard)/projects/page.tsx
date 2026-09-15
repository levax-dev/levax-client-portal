import type { Metadata } from "next"
import Link from "next/link"
import { KanbanSquare, Plus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { OrgSwitcher } from "@/components/layout/org-switcher"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getActiveOrg, requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Projects" }

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgParam } = await searchParams
  const user = await requireUser()
  const supabase = await createClient()

  let org = await getActiveOrg(user)
  let organizations: { id: string; name: string }[] | null = null

  if (user.isStaff) {
    const [{ data: allOrgs }, { data: paramOrg }] = await Promise.all([
      supabase.from("organizations").select("id, name").order("name"),
      orgParam
        ? supabase.from("organizations").select("*").eq("id", orgParam).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    organizations = allOrgs
    if (paramOrg) org = paramOrg
  }

  const { data: projects } = org
    ? await supabase
        .from("projects")
        .select("id, name, description, status, issues(count)")
        .eq("org_id", org.id)
        .eq("is_support_project", false)
        .order("created_at", { ascending: false })
    : { data: [] }

  const isOrgAdmin =
    user.isStaff || user.memberships.some((m) => m.org.id === org?.id && m.role === "admin")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track work with a Kanban board per project."
        actions={
          isOrgAdmin && (
            <Button render={<Link href="/projects/new" />}>
              <Plus />
              New project
            </Button>
          )
        }
      />

      {user.isStaff && organizations && (
        <OrgSwitcher organizations={organizations} activeOrgId={org?.id ?? null} />
      )}

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No projects yet"
          description="Create a project to start tracking work on a board."
          action={
            isOrgAdmin && (
              <Button render={<Link href="/projects/new" />}>
                <Plus />
                New project
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-start justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant="secondary" className="capitalize">
                    {project.status.replace("_", " ")}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description || "No description"}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {(project.issues as unknown as { count: number }[])?.[0]?.count ?? 0} issues
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
