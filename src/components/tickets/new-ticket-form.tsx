"use client"

import { useActionState, useState } from "react"

import { createTicket, type ActionState } from "@/app/actions/issues"
import { FilePicker } from "@/components/tickets/file-picker"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TICKET_CATEGORIES } from "@/lib/issue-meta"
import type { TicketCategory } from "@/types/database"

export interface ProjectOption {
  id: string
  name: string
  departments: { id: string; name: string }[]
}

const initialState: ActionState = null

export function NewTicketForm({ projects }: { projects: ProjectOption[] }) {
  const [state, action] = useActionState(createTicket, initialState)
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [category, setCategory] = useState<TicketCategory>("app_request")
  const [filesValid, setFilesValid] = useState(true)

  const selectedProject = projects.find((p) => p.id === projectId)
  const departments = selectedProject?.departments ?? []
  const categoryHint = TICKET_CATEGORIES.find((c) => c.value === category)?.hint

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
          <Select
            name="projectId"
            items={Object.fromEntries(projects.map((p) => [p.id, p.name]))}
            value={projectId}
            onValueChange={(value) => value && setProjectId(value)}
          >
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
            <Select
              key={projectId}
              name="departmentId"
              items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
              defaultValue={departments[0]?.id}
            >
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
        {departments.length === 1 && (
          <input type="hidden" name="departmentId" value={departments[0].id} />
        )}

        <Field>
          <FieldLabel htmlFor="category">What kind of request is this?</FieldLabel>
          <Select
            name="category"
            items={Object.fromEntries(TICKET_CATEGORIES.map((c) => [c.value, c.label]))}
            value={category}
            onValueChange={(value) => value && setCategory(value as TicketCategory)}
          >
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryHint && <FieldDescription>{categoryHint}</FieldDescription>}
        </Field>

        <Field>
          <FieldLabel htmlFor="title">Subject</FieldLabel>
          <Input
            id="title"
            name="title"
            placeholder="Eg. Can't log in to the dashboard"
            required
            maxLength={200}
          />
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
            Priority is set by our team once we triage it.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Attachments</FieldLabel>
          <FilePicker onValidityChange={setFilesValid} />
          <FieldDescription>
            Screenshots and screen recordings usually get a request moving faster than a description
            alone.
          </FieldDescription>
        </Field>

        <SubmitButton pendingText="Submitting…" disabled={!filesValid}>
          Submit ticket
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
