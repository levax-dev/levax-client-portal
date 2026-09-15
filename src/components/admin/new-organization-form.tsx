"use client"

import { useActionState } from "react"

import { createOrganization, type ActionState } from "@/app/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: ActionState = null

export function NewOrganizationForm() {
  const [state, action] = useActionState(createOrganization, initialState)

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="name">Organization name</FieldLabel>
          <Input id="name" name="name" placeholder="Eg. Acme Inc." required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="adminEmail">Primary contact email</FieldLabel>
          <Input id="adminEmail" name="adminEmail" type="email" placeholder="Eg. admin@acme.com" required />
          <FieldDescription>
            They&apos;ll get an email invite to set up their account as an org admin.
          </FieldDescription>
        </Field>
        <SubmitButton pendingText="Creating…">Create organization</SubmitButton>
      </FieldGroup>
    </form>
  )
}
