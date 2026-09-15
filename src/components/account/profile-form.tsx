"use client"

import { useActionState } from "react"

import { updateOwnProfile, type ActionState } from "@/app/actions/account"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

export function ProfileForm({
  fullName,
  email,
  phone,
  jobTitle,
  location,
  bio,
}: {
  fullName: string
  email: string
  phone: string
  jobTitle: string
  location: string
  bio: string
}) {
  const [state, action] = useActionState(updateOwnProfile, initialState)

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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fullName">Full name</FieldLabel>
            <Input id="fullName" name="fullName" defaultValue={fullName} required maxLength={120} />
          </Field>
          <Field>
            <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
            <Input id="jobTitle" name="jobTitle" defaultValue={jobTitle} placeholder="Operations Manager" maxLength={120} />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input id="phone" name="phone" type="tel" defaultValue={phone} placeholder="+91 98765 43210" maxLength={30} />
          </Field>
          <Field>
            <FieldLabel htmlFor="location">Location</FieldLabel>
            <Input id="location" name="location" defaultValue={location} placeholder="Chennai, India" maxLength={120} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="bio">Bio</FieldLabel>
          <Textarea id="bio" name="bio" defaultValue={bio} rows={3} placeholder="A short line about your role." maxLength={500} />
        </Field>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </FieldGroup>
    </form>
  )
}
