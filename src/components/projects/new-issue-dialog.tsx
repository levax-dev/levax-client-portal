"use client"

import { useActionState, useEffect, useRef } from "react"

import { createIssue, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export function NewIssueDialog({
  projectId,
  columnId,
  assignableUsers,
  onOpenChange,
}: {
  projectId: string
  columnId: string | null
  assignableUsers: { id: string; full_name: string | null }[]
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
        </DialogHeader>
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
                  items={{ task: "Task", bug: "Bug", feature: "Feature", ticket: "Ticket" }}
                  defaultValue="task"
                >
                  <SelectTrigger id="issue-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="ticket">Ticket</SelectItem>
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
                items={Object.fromEntries(assignableUsers.map((u) => [u.id, u.full_name ?? "Unnamed"]))}
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
            <SubmitButton className="w-full" pendingText="Creating…">
              Create issue
            </SubmitButton>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
