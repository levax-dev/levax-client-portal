"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { UserCog } from "lucide-react"

import { setProjectLead } from "@/app/actions/projects"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface StaffOption {
  id: string
  full_name: string | null
  avatar_url?: string | null
}

const UNASSIGNED = "unassigned"

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Who leads this project.
 *
 * Editable by a super admin on any project, and by the current lead handing
 * their own project on — the same rule the database enforces, so someone who
 * can't assign sees the lead as plain text rather than a control that fails.
 */
export function ProjectLeadControl({
  projectId,
  lead,
  staff,
  canAssign,
}: {
  projectId: string
  lead: StaffOption | null
  staff: StaffOption[]
  canAssign: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState(lead?.id ?? UNASSIGNED)

  if (!canAssign) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Lead</span>
        {lead ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-6">
              {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
              <AvatarFallback className="text-[10px]">
                {initials(lead.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{lead.full_name ?? "Unnamed"}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not assigned</span>
        )}
      </div>
    )
  }

  function assign(next: string) {
    const previous = selected
    setSelected(next)
    startTransition(async () => {
      const result = await setProjectLead(projectId, next === UNASSIGNED ? null : next)
      if (result?.error) {
        setSelected(previous) // the server refused — don't leave the UI claiming otherwise
        toast.error(result.error)
      } else if (result?.success) {
        toast.success(result.success)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="project-lead" className="flex items-center gap-1 text-xs text-muted-foreground">
        <UserCog className="size-3.5" />
        Lead
      </Label>
      <Select
        name="leadId"
        items={{
          [UNASSIGNED]: "Not assigned",
          ...Object.fromEntries(staff.map((s) => [s.id, s.full_name ?? "Unnamed"])),
        }}
        value={selected}
        disabled={isPending}
        onValueChange={(value) => value && assign(value)}
      >
        <SelectTrigger id="project-lead" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Not assigned</SelectItem>
          {staff.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.full_name ?? "Unnamed"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
