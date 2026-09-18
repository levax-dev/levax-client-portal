"use client"

import { useActionState, useState } from "react"
import { GitBranch } from "lucide-react"

import { convertTicketToTask, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

/**
 * Triage: break a ticket into the work it actually takes.
 *
 * The ticket stays put — this spawns a task on a delivery board and links it
 * back, so the client keeps following the thing they raised while the team
 * plans against something schedulable. Run it more than once to split a
 * request across several pieces of work.
 */
export function ConvertDialog({
  ticketId,
  ticketTitle,
  projects,
  assignableUsers,
  existingTaskCount,
}: {
  ticketId: string
  ticketTitle: string
  projects: { id: string; name: string }[]
  assignableUsers: { id: string; full_name: string | null }[]
  existingTaskCount: number
}) {
  const [state, action] = useActionState(convertTicketToTask, initialState)
  const [open, setOpen] = useState(false)

  // Closing on success is a render-time adjustment rather than an effect: the
  // result object identity is the signal, and reacting to it in an effect would
  // schedule a second render pass just to hide the dialog.
  const [lastResult, setLastResult] = useState(state)
  if (state !== lastResult) {
    setLastResult(state)
    if (state?.success) setOpen(false)
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approved project on this client to schedule work against yet.
      </p>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={existingTaskCount > 0 ? "outline" : "default"} size="sm" className="w-full" />
        }
      >
        <GitBranch />
        {existingTaskCount > 0 ? "Add another task" : "Plan work for this ticket"}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Plan work for this ticket</DialogTitle>
          <DialogDescription>
            Creates a task on a delivery board, linked back to this ticket. The ticket stays open so
            the client can keep following it.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="ticketId" value={ticketId} />
          <FieldGroup>
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <Field>
              <FieldLabel htmlFor="convert-project">Delivery board</FieldLabel>
              <Select
                name="projectId"
                items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
                defaultValue={projects[0]?.id}
              >
                <SelectTrigger id="convert-project" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="convert-title">Task</FieldLabel>
              <Input
                id="convert-title"
                name="title"
                defaultValue={ticketTitle}
                required
                maxLength={200}
              />
              <FieldDescription>
                Name the work, not the request — &ldquo;Add CSV export to orders grid&rdquo;.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="convert-description">Scope</FieldLabel>
              <Textarea
                id="convert-description"
                name="description"
                rows={3}
                placeholder="What this task covers, and anything the assignee needs to know."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="convert-assignee">Assign to</FieldLabel>
                <Select
                  name="assigneeId"
                  items={Object.fromEntries(
                    assignableUsers.map((u) => [u.id, u.full_name ?? "Unnamed"])
                  )}
                >
                  <SelectTrigger id="convert-assignee" className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name ?? "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="convert-priority">Priority</FieldLabel>
                <Select
                  name="priority"
                  items={{ low: "Low", medium: "Medium", high: "High", urgent: "Urgent" }}
                  defaultValue="medium"
                >
                  <SelectTrigger id="convert-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="convert-start">Starts</FieldLabel>
                <Input id="convert-start" name="startDate" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="convert-due">Delivery</FieldLabel>
                <Input id="convert-due" name="dueDate" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="convert-hours">Est. hours</FieldLabel>
                <Input
                  id="convert-hours"
                  name="estimatedHours"
                  type="number"
                  min={0}
                  max={1000}
                  step={0.5}
                  placeholder="8"
                />
              </Field>
            </div>
            <FieldDescription>
              The delivery date is what the client sees on their schedule, and the estimate is what
              drives capacity planning.
            </FieldDescription>

            <SubmitButton className="w-full" pendingText="Creating…">
              Create task
            </SubmitButton>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
