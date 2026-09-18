"use server"

import { revalidatePath } from "next/cache"

import { storeAttachments } from "@/lib/attachments"
import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error?: string; success?: string } | null

/**
 * Attaches one or more files to an existing ticket. File types are restricted
 * to an allowlist (see `lib/uploads`) and checked here rather than only in the
 * browser, because a Server Function can be POSTed to directly.
 */
export async function uploadAttachment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const issueId = formData.get("issueId") as string | null
  const orgId = formData.get("orgId") as string | null
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)

  if (!issueId || !orgId) return { error: "Missing ticket reference." }
  if (files.length === 0) return { error: "Choose a file to upload." }

  const user = await requireUser()
  const supabase = await createClient()

  // Trust the issue, not the form: the org id decides the storage path, and
  // the storage policies read the org out of that path.
  const { data: issue } = await supabase
    .from("issues")
    .select("id, org_id")
    .eq("id", issueId)
    .maybeSingle()
  if (!issue) return { error: "That ticket could not be found." }

  const { error } = await storeAttachments({
    supabase,
    orgId: issue.org_id,
    issueId: issue.id,
    userId: user.id,
    files,
  })
  if (error) return { error }

  revalidatePath(`/tickets/${issueId}`)
  return { success: files.length === 1 ? "File uploaded." : `${files.length} files uploaded.` }
}

export async function removeAttachment(id: string, filePath: string, issueId: string) {
  const user = await requireUser()
  const supabase = await createClient()

  // RLS already limits deletes to the uploader or staff; bail early so the
  // storage object isn't removed when the row delete is going to be refused.
  const { data: attachment } = await supabase
    .from("attachments")
    .select("id, uploaded_by")
    .eq("id", id)
    .maybeSingle()
  if (!attachment) return
  if (attachment.uploaded_by !== user.id && !user.isStaff) return

  await supabase.storage.from("attachments").remove([filePath])
  await supabase.from("attachments").delete().eq("id", id)
  revalidatePath(`/tickets/${issueId}`)
}

export async function getAttachmentUrl(filePath: string) {
  await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.storage.from("attachments").createSignedUrl(filePath, 60 * 10)
  return data?.signedUrl ?? null
}
