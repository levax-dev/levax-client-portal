"use client"

import { useActionState, useState } from "react"

import { createTicket, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export interface ProjectOption {
  id: string
  name: string
  departments: { id: string; name: string }[]
}

const initialState: ActionState = null

export function NewTicketForm({ projects }: { projects: ProjectOption[] }) {
  const [state, action] = useActionState(createTicket, initialState)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")

  const selectedProject = projects.find((p) => p.id === projectId)
  const departments = selectedProject?.departments ?? []

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="projectId">Project</FieldLabel>
          <Select name="projectId" value={projectId} onValueChange={(value) => value && setProjectId(value)}>
            <SelectTrigger id="projectId" className="w-full">
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
        {departments.length > 1 && (
          <Field>
            <FieldLabel htmlFor="departmentId">Department</FieldLabel>
            <Select name="departmentId" defaultValue={departments[0]?.id}>
              <SelectTrigger id="departmentId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {departments.length === 1 && <input type="hidden" name="departmentId" value={departments[0].id} />}
        <Field>
          <FieldLabel htmlFor="title">Subject</FieldLabel>
          <Input id="title" name="title" placeholder="Eg. Can't log in to the dashboard" required maxLength={200} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Details</FieldLabel>
          <Textarea
            id="description"
            name="description"
            placeholder="Eg. I get a 500 error when clicking Save. Expected it to update the record."
            rows={6}
          />
          <FieldDescription>
            You can attach files after the ticket is created. Priority is set by our team once we triage it.
          </FieldDescription>
        </Field>
        <SubmitButton pendingText="Submitting…">Submit ticket</SubmitButton>
      </FieldGroup>
    </form>
  )
}
