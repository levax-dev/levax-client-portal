import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Building2, Plus } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Organizations" }

export default async function OrganizationsPage() {
  const user = await requireUser()
  if (!user.isStaff) redirect("/dashboard")

  const supabase = await createClient()
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, status, org_members(count)")
    .order("name")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Every client organization on the platform."
        actions={
          <Button render={<Link href="/admin/organizations/new" />}>
            <Plus />
            New organization
          </Button>
        }
      />

      {!organizations || organizations.length === 0 ? (
        <EmptyState icon={Building2} title="No organizations yet" description="Create your first client organization." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Link key={org.id} href={`/admin/organizations/${org.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{org.name}</CardTitle>
                  <Badge variant={org.status === "active" ? "secondary" : "destructive"} className="capitalize">
                    {org.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {(org.org_members as unknown as { count: number }[])?.[0]?.count ?? 0} members
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
