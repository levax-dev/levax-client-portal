"use client"

import { useActionState, useRef } from "react"

import { createDepartment, type ActionState } from "@/app/actions/departments"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"

const initialState: ActionState = null

export function NewDepartmentForm({ orgId }: { orgId?: string }) {
  const [state, action] = useActionState(createDepartment, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData)
        formRef.current?.reset()
      }}
      className="space-y-2"
    >
      {orgId && <input type="hidden" name="orgId" value={orgId} />}
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input name="name" placeholder="Eg. Marketing" required maxLength={120} className="h-8" />
        <SubmitButton size="sm" pendingText="Adding…">
          Add
        </SubmitButton>
      </div>
    </form>
  )
}
