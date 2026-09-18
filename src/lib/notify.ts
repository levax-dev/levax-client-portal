import "server-only"

import type { createClient } from "@/lib/supabase/server"

type ServerClient = Awaited<ReturnType<typeof createClient>>

export interface NotifyInput {
  userIds: string[]
  orgId: string | null
  type: string
  title: string
  body?: string | null
  link?: string | null
  /** Never notify the person who caused the event. */
  exceptUserId?: string | null
}

/**
 * Fire-and-forget in-app notifications. Failures are swallowed deliberately —
 * a notification that doesn't send should never fail the action that triggered
 * it (a ticket still got raised, a project still got approved).
 */
export async function notify(supabase: ServerClient, input: NotifyInput): Promise<void> {
  const recipients = Array.from(new Set(input.userIds)).filter(
    (id) => id && id !== input.exceptUserId
  )
  if (recipients.length === 0) return

  await supabase.from("notifications").insert(
    recipients.map((userId) => ({
      user_id: userId,
      org_id: input.orgId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    }))
  )
}
