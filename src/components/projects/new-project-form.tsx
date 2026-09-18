"use client"

import { useActionState } from "react"

import { createProject, type ActionState } from "@/app/actions/projects"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export function NewProjectForm({
  departments,
  staffProfiles,
  needsApproval,
}: {
  departments: { id: string; name: string }[]
  staffProfiles: { id: string; full_name: string | null }[]
  /** Staff propose projects; the client signs them off before work starts. */
  needsApproval: boolean
}) {
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
        <Field>
          <FieldLabel>Departments involved</FieldLabel>
          <div className="space-y-2 rounded-md border p-3">
            {departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No departments yet — add one from the Team page first.
              </p>
            ) : (
              departments.map((dept) => (
                <Label key={dept.id} className="flex items-center gap-2 text-sm font-normal">
                  <Checkbox name="departmentIds" value={dept.id} />
                  {dept.name}
                </Label>
              ))
            )}
          </div>
          <FieldDescription>
            Clients are only able to raise tickets into this project if they belong to one of these
            departments.
          </FieldDescription>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="startDate">Planned start</FieldLabel>
            <Input id="startDate" name="startDate" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor="targetDate">Target delivery</FieldLabel>
            <Input id="targetDate" name="targetDate" type="date" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="leadId">Project lead</FieldLabel>
          <Select name="leadId" items={Object.fromEntries(staffProfiles.map((p) => [p.id, p.full_name ?? "Unnamed"]))}>
            <SelectTrigger id="leadId" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {staffProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name ?? "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            The lead triages incoming tickets on this project — sets priority and assigns them to staff.
          </FieldDescription>
        </Field>
        {needsApproval && (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            This goes to the client as a request. Work can&apos;t start on the board until someone
            at the organization approves it.
          </p>
        )}
        <SubmitButton pendingText="Creating…" disabled={departments.length === 0}>
          {needsApproval ? "Send for approval" : "Create project"}
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
