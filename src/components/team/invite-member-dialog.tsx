"use client"

import { useActionState, useEffect, useState } from "react"
import { UserPlus } from "lucide-react"

import { inviteMember, type ActionState } from "@/app/actions/team"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const initialState: ActionState = null

export function InviteMemberDialog({ orgId }: { orgId?: string } = {}) {
  const [open, setOpen] = useState(false)
  const [state, action] = useActionState(inviteMember, initialState)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the dialog is a UI reaction to the action's result, not a render-time derivation
    if (state?.success) setOpen(false)
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        Invite member
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {orgId && <input type="hidden" name="orgId" value={orgId} />}
          <FieldGroup>
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="invite-email">Email</FieldLabel>
              <Input id="invite-email" name="email" type="email" required placeholder="jane@client.com" />
            </Field>
            <Field>
              <FieldLabel htmlFor="invite-role">Role</FieldLabel>
              <Select name="role" defaultValue="member">
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <SubmitButton className="w-full" pendingText="Sending invite…">
              Send invite
            </SubmitButton>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
