"use client"

import { useTransition } from "react"
import { Pencil } from "lucide-react"

import { assignMemberDepartment, removeMemberDepartment } from "@/app/actions/departments"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function MemberDepartmentsEditor({
  orgMemberId,
  allDepartments,
  memberDepartmentIds,
}: {
  orgMemberId: string
  allDepartments: { id: string; name: string }[]
  memberDepartmentIds: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const selected = new Set(memberDepartmentIds)

  function toggle(deptId: string, checked: boolean) {
    startTransition(() =>
      checked ? assignMemberDepartment(orgMemberId, deptId) : removeMemberDepartment(orgMemberId, deptId)
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {memberDepartmentIds.length === 0 && <span className="text-xs text-muted-foreground">No departments</span>}
      {allDepartments
        .filter((d) => selected.has(d.id))
        .map((d) => (
          <Badge key={d.id} variant="secondary" className="text-[10px]">
            {d.name}
          </Badge>
        ))}
      <Popover>
        <PopoverTrigger render={<Button variant="ghost" size="icon-xs" disabled={isPending} />}>
          <Pencil className="size-3" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 space-y-1.5">
          {allDepartments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          ) : (
            allDepartments.map((d) => (
              <Label key={d.id} className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  checked={selected.has(d.id)}
                  onCheckedChange={(checked) => toggle(d.id, checked === true)}
                />
                {d.name}
              </Label>
            ))
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
