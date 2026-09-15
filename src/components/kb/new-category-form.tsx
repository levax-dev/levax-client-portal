"use client"

import { useActionState, useRef } from "react"

import { createKbCategory, type ActionState } from "@/app/actions/kb"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const initialState: ActionState = null

export function NewCategoryForm() {
  const [state, action] = useActionState(createKbCategory, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData)
        formRef.current?.reset()
      }}
      className="space-y-3"
    >
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
          <FieldLabel htmlFor="cat-name">New category</FieldLabel>
          <Input id="cat-name" name="name" placeholder="Getting started" required maxLength={120} />
        </Field>
        <SubmitButton variant="outline" size="sm" pendingText="Adding…">
          Add category
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
