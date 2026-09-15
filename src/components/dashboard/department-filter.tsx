"use client"

import { useRouter } from "next/navigation"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DepartmentFilter({
  departments,
  activeDeptId,
}: {
  departments: { id: string; name: string }[]
  activeDeptId?: string
}) {
  const router = useRouter()

  if (departments.length < 2) return null

  return (
    <Select
      value={activeDeptId ?? "all"}
      onValueChange={(value) => router.push(value && value !== "all" ? `/dashboard?dept=${value}` : "/dashboard")}
    >
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="All departments" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All departments</SelectItem>
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
