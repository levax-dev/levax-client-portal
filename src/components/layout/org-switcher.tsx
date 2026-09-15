"use client"

import { useTransition } from "react"
import { Building2, Check, ChevronsUpDown } from "lucide-react"

import { setActiveOrg } from "@/app/actions/org"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function OrgSwitcher({
  organizations,
  activeOrgId,
}: {
  organizations: { id: string; name: string }[]
  activeOrgId: string | null
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" disabled={isPending} />}>
        <Building2 className="size-4" />
        <span className="max-w-40 truncate">
          {organizations.find((o) => o.id === activeOrgId)?.name ?? "Select organization"}
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Viewing as staff</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => startTransition(() => setActiveOrg(org.id))}
          >
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrgId && <Check className={cn("size-4")} />}
          </DropdownMenuItem>
        ))}
        {organizations.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">No organizations yet.</p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
