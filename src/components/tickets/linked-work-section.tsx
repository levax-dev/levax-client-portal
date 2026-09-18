import Link from "next/link"
import { CornerLeftUp, GitBranch } from "lucide-react"

import { ConvertDialog } from "@/components/tickets/convert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CapacityMeter } from "@/components/work/capacity-meter"
import { DueCell } from "@/components/work/status-pill"
import { PersonCell } from "@/components/work/work-table"
import { formatHours } from "@/lib/issue-meta"
import { formatDateShort, todayISO } from "@/lib/periods"
import { createClient } from "@/lib/supabase/server"

/**
 * The lineage panel on a ticket or task.
 *
 * On a ticket it lists the tasks raised from it (and, for staff, the control to
 * raise another). On a task it points back at the ticket that caused it —
 * every task has one, which is what keeps delivery traceable to a request.
 */
export async function LinkedWorkSection({
  issueId,
  issueTitle,
  issueType,
  orgId,
  parentTicketId,
  canTriage,
}: {
  issueId: string
  issueTitle: string
  issueType: string
  orgId: string
  parentTicketId: string | null
  canTriage: boolean
}) {
  const supabase = await createClient()
  const today = todayISO()

  if (issueType !== "ticket") {
    const { data: parent } = parentTicketId
      ? await supabase
          .from("issues")
          .select("id, title, category")
          .eq("id", parentTicketId)
          .maybeSingle()
      : { data: null }

    if (!parent) return null

    return (
      <div className="rounded-lg border bg-muted/30 px-3 py-2">
        <Link
          href={`/tickets/${parent.id}`}
          className="flex items-center gap-2 text-sm hover:underline"
        >
          <CornerLeftUp className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Raised from ticket:</span>
          <span className="truncate font-medium">{parent.title}</span>
        </Link>
      </div>
    )
  }

  const [{ data: tasks }, { data: projects }, { data: staffProfiles }] = await Promise.all([
    supabase
      .from("issues")
      .select(
        `id, title, due_date, resolved_at, estimated_hours, project_id,
         projects!issues_project_id_fkey(name),
         board_columns(name, color),
         assignee:profiles!issues_assignee_id_fkey(id, full_name, avatar_url)`
      )
      .eq("parent_ticket_id", issueId)
      .order("due_date", { nullsFirst: false }),
    canTriage
      ? supabase
          .from("projects")
          .select("id, name")
          .eq("org_id", orgId)
          .eq("approval_status", "approved")
          .eq("status", "active")
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    canTriage
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("platform_role", ["staff", "super_admin"])
          .order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])

  const rows = tasks ?? []
  const done = rows.filter((t) => t.resolved_at).length
  const totalHours = rows.reduce((sum, t) => sum + Number(t.estimated_hours ?? 0), 0)

  if (rows.length === 0 && !canTriage) return null

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 py-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <GitBranch className="size-4" />
          Work raised from this ticket
          {rows.length > 0 && (
            <span className="font-normal text-muted-foreground">
              {done} of {rows.length} delivered
            </span>
          )}
        </CardTitle>
        {rows.length > 0 && (
          <CapacityMeter planned={done} capacity={rows.length} className="w-40" />
        )}
      </CardHeader>

      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Board</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Est.</TableHead>
              <TableHead>Delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((task) => {
              const column = task.board_columns as unknown as {
                name: string
                color: string
              } | null
              const project = task.projects as unknown as { name: string } | null
              return (
                <TableRow key={task.id}>
                  <TableCell className="py-2.5 font-medium">
                    <Link href={`/tickets/${task.id}`} className="hover:underline">
                      {task.title}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm text-muted-foreground">
                    <Link href={`/projects/${task.project_id}`} className="hover:underline">
                      {project?.name ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="py-2.5 text-sm" style={{ color: column?.color }}>
                    {column?.name ?? "—"}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <PersonCell
                      person={task.assignee as unknown as Parameters<typeof PersonCell>[0]["person"]}
                    />
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-sm tabular-nums text-muted-foreground">
                    {formatHours(task.estimated_hours)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      {task.due_date && (
                        <span className="text-sm whitespace-nowrap tabular-nums">
                          {formatDateShort(task.due_date, today)}
                        </span>
                      )}
                      <DueCell
                        dueDate={task.due_date}
                        resolvedAt={task.resolved_at}
                        today={today}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">
            Nothing scheduled against this ticket yet. Plan the work and the client sees a delivery
            date on their schedule.
          </p>
        </CardContent>
      )}

      {canTriage && (
        <CardContent className="border-t py-3">
          <ConvertDialog
            ticketId={issueId}
            ticketTitle={issueTitle}
            projects={projects ?? []}
            assignableUsers={staffProfiles ?? []}
            existingTaskCount={rows.length}
          />
          {totalHours > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatHours(totalHours)} estimated across {rows.length}{" "}
              {rows.length === 1 ? "task" : "tasks"}.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
