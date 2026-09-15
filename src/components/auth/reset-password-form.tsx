"use client"

import { useActionState } from "react"

import { updatePassword } from "@/app/actions/auth"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, null)

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Make it at least 8 characters.</p>
      </div>

      <form action={action}>
        <FieldGroup>
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input id="password" name="password" type="password" required autoComplete="new-password" />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
          </Field>
          <SubmitButton className="w-full" pendingText="Saving…">
            Update password
          </SubmitButton>
        </FieldGroup>
      </form>
    </div>
  )
}
