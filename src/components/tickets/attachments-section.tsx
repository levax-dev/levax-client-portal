import { AttachmentsPanel } from "@/components/tickets/attachments-panel"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function AttachmentsSection({ issueId, orgId }: { issueId: string; orgId: string }) {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("issue_id", issueId)
    .order("created_at")

  const attachmentsWithUrls = await Promise.all(
    (attachments ?? []).map(async (a) => {
      const { data } = await supabase.storage.from("attachments").createSignedUrl(a.file_path, 60 * 30)
      return {
        ...a,
        url: data?.signedUrl ?? null,
        canDelete: a.uploaded_by === user.id || user.isStaff,
      }
    })
  )

  return <AttachmentsPanel issueId={issueId} orgId={orgId} attachments={attachmentsWithUrls} />
}
