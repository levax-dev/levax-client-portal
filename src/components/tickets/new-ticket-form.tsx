"use client"

import { useActionState } from "react"

import { createTicket, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export function NewTicketForm() {
  const [state, action] = useActionState(createTicket, initialState)

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="title">Subject</FieldLabel>
          <Input id="title" name="title" placeholder="Can't log in to the dashboard" required maxLength={200} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Details</FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="Steps to reproduce, error messages, what you expected to happen…"
            rows={6}
          />
          <FieldDescription>You can attach files after the ticket is created.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="priority">Priority</FieldLabel>
          <Select name="priority" defaultValue="medium">
            <SelectTrigger id="priority" className="w-full">
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
        <SubmitButton pendingText="Submitting…">Submit ticket</SubmitButton>
      </FieldGroup>
    </form>
  )
}
