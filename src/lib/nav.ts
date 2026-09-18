import type { LucideIcon } from "lucide-react"
import {
  Book,
  Building2,
  CalendarClock,
  ClipboardCheck,
  KanbanSquare,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
  UsersRound,
} from "lucide-react"

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  /** Omit to show for everyone; otherwise restrict to a role. */
  visibility?: "staff" | "org-admin" | "project-lead"
}

export const mainNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Schedule", url: "/schedule", icon: CalendarClock },
  { title: "Tickets", url: "/tickets", icon: Ticket },
  { title: "Projects", url: "/projects", icon: KanbanSquare },
  { title: "Work log", url: "/work-log", icon: ClipboardCheck },
  { title: "Knowledge base", url: "/knowledge-base", icon: Book },
]

export const orgNav: NavItem[] = [
  { title: "Team", url: "/team", icon: Users, visibility: "org-admin" },
  { title: "Account", url: "/account", icon: Settings },
]

export const staffNav: NavItem[] = [
  { title: "Team tracking", url: "/team-tracking", icon: UsersRound, visibility: "project-lead" },
  { title: "Organizations", url: "/admin/organizations", icon: Building2, visibility: "staff" },
]
