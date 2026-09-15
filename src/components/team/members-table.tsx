"use client"

import { useTransition } from "react"
import { MoreHorizontal } from "lucide-react"

import { removeMember, updateMemberRole } from "@/app/actions/team"
import { MemberDepartmentsEditor } from "@/components/team/member-departments-editor"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OrgRole } from "@/types/database"

export interface MemberRow {
  id: string
  role: OrgRole
  profile: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
  departmentIds: string[]
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

export function MembersTable({
  members,
  currentUserId,
  departments,
}: {
  members: MemberRow[]
  currentUserId: string
  departments: { id: string; name: string }[]
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Members ({members.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Departments</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      {member.profile?.avatar_url && <AvatarImage src={member.profile.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        {initials(member.profile?.full_name ?? member.profile?.email ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profile?.full_name ?? "Unnamed"}
                        {member.profile?.id === currentUserId && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.profile?.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <MemberDepartmentsEditor
                    orgMemberId={member.id}
                    allDepartments={departments}
                    memberDepartmentIds={member.departmentIds}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          startTransition(() =>
                            updateMemberRole(member.id, member.role === "admin" ? "member" : "admin")
                          )
                        }
                      >
                        Make {member.role === "admin" ? "member" : "admin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => startTransition(() => removeMember(member.id))}
                      >
                        Remove from org
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
