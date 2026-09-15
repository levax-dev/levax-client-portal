import Link from "next/link"
import { Building2 } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export async function OrganizationsListSection() {
  const supabase = await createClient()
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, status, org_members(count)")
    .order("name")

  if (!organizations || organizations.length === 0) {
    return (
      <EmptyState icon={Building2} title="No organizations yet" description="Create your first client organization." />
    )
  }

  return (
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
  )
}
