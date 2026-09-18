"use client"

import { useActionState, useState } from "react"
import { CheckCircle2 } from "lucide-react"

import { completeIssue, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"

const initialState: ActionState = null

/**
 * Closing something requires saying what was done.
 *
 * That sentence is the entire substance of the work log the client reads back
 * at the end of a week — "Resolved" on its own tells them nothing they can use,
 * so the note is required rather than optional.
 */
export function CompleteDialog({
  issueId,
  title,
  label = "Mark delivered",
}: {
  issueId: string
  title: string
  label?: string
}) {
  const [state, action] = useActionState(completeIssue, initialState)
  const [open, setOpen] = useState(false)

  // Closing on success is a render-time adjustment rather than an effect: the
  // result object identity is the signal, and reacting to it in an effect would
  // schedule a second render pass just to hide the dialog.
  const [lastResult, setLastResult] = useState(state)
  if (state !== lastResult) {
    setLastResult(state)
    if (state?.success) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full" />}>
        <CheckCircle2 />
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close &ldquo;{title}&rdquo;</DialogTitle>
          <DialogDescription>
            Moves it to the done column and records what was delivered.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={issueId} />

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="resolution-note">What was done?</FieldLabel>
            <Textarea
              id="resolution-note"
              name="resolutionNote"
              rows={4}
              required
              maxLength={4000}
              autoFocus
              placeholder="Eg. Added a CSV export button to the orders grid. Exports respect the active filters and include the order notes column."
            />
            <FieldDescription>
              The client reads this in their work log, so write it for them rather than for the
              board.
            </FieldDescription>
          </Field>

          <SubmitButton className="w-full" pendingText="Closing…">
            Close and record
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}
