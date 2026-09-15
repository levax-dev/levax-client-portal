import { Suspense } from "react"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { NotificationBellSection } from "@/components/layout/notification-bell-section"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { getActiveOrg, requireUser } from "@/lib/auth"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const activeOrg = await getActiveOrg(user)

  const isOrgAdmin = user.memberships.some(
    (m) => m.org.id === activeOrg?.id && m.role === "admin"
  )

  return (
    <SidebarProvider>
      <AppSidebar isStaff={user.isStaff} isOrgAdmin={isOrgAdmin} orgName={activeOrg?.name ?? null} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <Suspense fallback={<Button variant="ghost" size="icon" disabled aria-label="Notifications"><Bell /></Button>}>
              <NotificationBellSection />
            </Suspense>
            <ThemeToggle />
            <UserMenu
              name={user.profile.full_name ?? user.email}
              email={user.email}
              avatarUrl={user.profile.avatar_url}
            />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
