"use client"

import { useTransition } from "react"

import { reactivateOrganization, suspendOrganization } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import type { OrgStatus } from "@/types/database"

export function OrgStatusActions({ orgId, status }: { orgId: string; status: OrgStatus }) {
  const [isPending, startTransition] = useTransition()

  if (status === "active") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => suspendOrganization(orgId))}
      >
        Suspend
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => reactivateOrganization(orgId))}
    >
      Reactivate
    </Button>
  )
}
