"use client"

import { useActionState } from "react"

import { updateOrgProfile, type ActionState } from "@/app/actions/account"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: ActionState = null

export function OrgProfileForm({ orgName }: { orgName: string }) {
  const [state, action] = useActionState(updateOrgProfile, initialState)

  return (
    <form action={action}>
      <FieldGroup>
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        {state?.success && (
          <Alert>
            <AlertDescription>{state.success}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="orgName">Organization name</FieldLabel>
          <Input id="orgName" name="name" defaultValue={orgName} required maxLength={120} />
        </Field>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </FieldGroup>
    </form>
  )
}
