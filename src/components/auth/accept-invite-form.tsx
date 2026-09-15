"use client"

import { useActionState } from "react"

import { acceptInvite, type ActionState } from "@/app/actions/auth"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const boundAction = acceptInvite.bind(null, token) as (
    state: ActionState,
    formData: FormData
  ) => Promise<ActionState>
  const [state, action] = useActionState(boundAction, null)

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
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={email} disabled />
        </Field>
        <Field>
          <FieldLabel htmlFor="fullName">Your name</FieldLabel>
          <Input id="fullName" name="fullName" placeholder="Jane Doe" required autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Create a password</FieldLabel>
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </Field>
        <SubmitButton className="w-full" pendingText="Creating your account…">
          Accept invite &amp; create account
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
