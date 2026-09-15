import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface StaffContributionRow {
  id: string
  fullName: string | null
  avatarUrl: string | null
  assigned: number
  resolved: number
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

export function StaffContributions({ rows }: { rows: StaffContributionRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff contributions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff member</TableHead>
              <TableHead className="text-right">Assigned</TableHead>
              <TableHead className="text-right">Resolved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      {row.avatarUrl && <AvatarImage src={row.avatarUrl} />}
                      <AvatarFallback className="text-[10px]">{initials(row.fullName ?? "?")}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{row.fullName ?? "Unnamed"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{row.assigned}</TableCell>
                <TableCell className="text-right">{row.resolved}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No staff activity yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
