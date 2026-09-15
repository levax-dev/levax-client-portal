"use client"

import { useActionState } from "react"

import { createProject, type ActionState } from "@/app/actions/projects"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export function NewProjectForm() {
  const [state, action] = useActionState(createProject, initialState)

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="name">Project name</FieldLabel>
          <Input id="name" name="name" placeholder="Eg. Website redesign" required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea id="description" name="description" rows={4} placeholder="Eg. Migrating our product catalog to the new platform." />
          <FieldDescription>
            You&apos;ll get a Kanban board with Backlog, To Do, In Progress, In Review, and Done columns.
          </FieldDescription>
        </Field>
        <SubmitButton pendingText="Creating…">Create project</SubmitButton>
      </FieldGroup>
    </form>
  )
}
