"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"

import { createIssue, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export interface TicketOption {
  id: string
  title: string
}

/**
 * Adds a task to a board.
 *
 * A task always names the ticket it came from — the same rule the database
 * enforces — so the client can trace any piece of delivery back to a request
 * they made. With no tickets on the org yet there's nothing to build against,
 * and the dialog says so rather than offering an empty picker.
 */
export function NewIssueDialog({
  projectId,
  columnId,
  assignableUsers,
  tickets,
  onOpenChange,
}: {
  projectId: string
  columnId: string | null
  assignableUsers: { id: string; full_name: string | null }[]
  tickets: TicketOption[]
  onOpenChange: (open: boolean) => void
}) {
  const [state, action] = useActionState(createIssue, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      onOpenChange(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <Dialog open={!!columnId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>
            Every task hangs off the ticket that asked for it.
          </DialogDescription>
        </DialogHeader>

        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            There are no open tickets on this organization yet. Work starts from a request —{" "}
            <Link href="/tickets/new" className="text-primary hover:underline">
              raise a ticket
            </Link>{" "}
            first, then plan the work off it.
          </p>
        ) : (
          <form ref={formRef} action={action} className="space-y-4">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="columnId" value={columnId ?? ""} />
            <FieldGroup>
              {state?.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="issue-parent">Root ticket</FieldLabel>
                <Select
                  name="parentTicketId"
                  items={Object.fromEntries(tickets.map((t) => [t.id, t.title]))}
                  defaultValue={tickets[0]?.id}
                >
                  <SelectTrigger id="issue-parent" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tickets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>The client request this work delivers against.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="issue-title">Title</FieldLabel>
                <Input id="issue-title" name="title" required maxLength={200} autoFocus />
              </Field>

              <Field>
                <FieldLabel htmlFor="issue-description">Description</FieldLabel>
                <Textarea id="issue-description" name="description" rows={3} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="issue-type">Type</FieldLabel>
                  <Select
                    name="type"
                    items={{ task: "Task", bug: "Bug", feature: "Feature" }}
                    defaultValue="task"
                  >
                    <SelectTrigger id="issue-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="issue-priority">Priority</FieldLabel>
                  <Select
                    name="priority"
                    items={{ low: "Low", medium: "Medium", high: "High", urgent: "Urgent" }}
                    defaultValue="medium"
                  >
                    <SelectTrigger id="issue-priority" className="w-full">
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

              <Field>
                <FieldLabel htmlFor="issue-assignee">Assignee</FieldLabel>
                <Select
                  name="assigneeId"
                  items={Object.fromEntries(
                    assignableUsers.map((u) => [u.id, u.full_name ?? "Unnamed"])
                  )}
                >
                  <SelectTrigger id="issue-assignee" className="w-full">
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

              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel htmlFor="issue-start">Starts</FieldLabel>
                  <Input id="issue-start" name="startDate" type="date" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="issue-due">Delivery</FieldLabel>
                  <Input id="issue-due" name="dueDate" type="date" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="issue-hours">Est. hrs</FieldLabel>
                  <Input
                    id="issue-hours"
                    name="estimatedHours"
                    type="number"
                    min={0}
                    max={1000}
                    step={0.5}
                  />
                </Field>
              </div>

              <SubmitButton className="w-full" pendingText="Creating…">
                Create task
              </SubmitButton>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
