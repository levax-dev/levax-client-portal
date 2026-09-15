"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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

  const isActivePath = (url: string) => pathname === url || pathname.startsWith(`${url}/`)

  const renderItems = (items: NavItem[]) =>
    items.filter(canShow).map((item) => {
      const isActive = isActivePath(item.url)
      return (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton
            isActive={isActive}
            tooltip={item.title}
            render={<Link href={item.url} />}
            className={cn(
              "data-active:border-l-2 data-active:border-brand-gold data-active:pl-1.5",
              "group-data-[collapsible=icon]:data-active:border-l-0 group-data-[collapsible=icon]:data-active:pl-2"
            )}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })

  const footerItems = orgNav.filter(canShow)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="ring-brand-gold/40 flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-xs ring-1">
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
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-center gap-1 border-t border-sidebar-border pt-2">
          {footerItems.map((item) => {
            const isActive = isActivePath(item.url)
            return (
              <Tooltip key={item.url}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground ring-brand-gold/50 ring-1"
                      )}
                      render={<Link href={item.url} />}
                    />
                  }
                >
                  <item.icon />
                </TooltipTrigger>
                <TooltipContent side="top">{item.title}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
