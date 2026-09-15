"use client"

import { useTransition } from "react"
import { formatDistanceToNow } from "date-fns"

import { revokeInvite } from "@/app/actions/team"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrgRole } from "@/types/database"

export interface InviteRow {
  id: string
  email: string
  role: OrgRole
  created_at: string
  expires_at: string
}

export function PendingInvites({ invites }: { invites: InviteRow[] }) {
  const [isPending, startTransition] = useTransition()

  if (invites.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Pending invites ({invites.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                Invited {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {invite.role}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => revokeInvite(invite.id))}
              >
                Revoke
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
