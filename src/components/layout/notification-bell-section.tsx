import { NotificationBell } from "@/components/layout/notification-bell"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function NotificationBellSection() {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return <NotificationBell notifications={notifications ?? []} />
}
