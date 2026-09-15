"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { mainNav, orgNav, staffNav, type NavItem } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function AppSidebar({
  isStaff,
  isOrgAdmin,
  orgName,
}: {
  isStaff: boolean
  isOrgAdmin: boolean
  orgName: string | null
}) {
  const pathname = usePathname()

  const canShow = (item: NavItem) => {
    if (item.visibility === "staff") return isStaff
    if (item.visibility === "org-admin") return isStaff || isOrgAdmin
    return true
  }

  const renderItems = (items: NavItem[]) =>
    items.filter(canShow).map((item) => {
      const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`)
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.title}
            render={<Link href={item.url} />}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-black/5">
                <Image src="/logo-icon.png" alt="" width={32} height={28} className="size-6 object-contain" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">Levax Portal</span>
                <span className={cn("text-xs text-muted-foreground", !orgName && "invisible")}>
                  {orgName ?? "—"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel>Staff</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(staffNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(orgNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
