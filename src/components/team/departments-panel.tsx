import { NewDepartmentForm } from "@/components/team/new-department-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface DepartmentRow {
  id: string
  name: string
}

export function DepartmentsPanel({ departments }: { departments: DepartmentRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Departments ({departments.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No departments yet. Add one below — Eg. Marketing, Sales, Support.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {departments.map((d) => (
              <Badge key={d.id} variant="secondary">
                {d.name}
              </Badge>
            ))}
          </div>
        )}
        <NewDepartmentForm />
      </CardContent>
    </Card>
  )
}
