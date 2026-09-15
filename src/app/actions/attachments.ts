"use server"

import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export type ActionState = { error?: string; success?: string } | null

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export async function uploadAttachment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const issueId = formData.get("issueId") as string | null
  const orgId = formData.get("orgId") as string | null
  const file = formData.get("file") as File | null

  if (!issueId || !orgId) return { error: "Missing ticket reference." }
  if (!file || file.size === 0) return { error: "Choose a file to upload." }
  if (file.size > MAX_FILE_SIZE) return { error: "File is too large (25MB max)." }

  const user = await requireUser()
  const supabase = await createClient()

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${orgId}/${issueId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(path, file, { contentType: file.type || undefined })
  if (uploadError) return { error: uploadError.message }

  const { error } = await supabase.from("attachments").insert({
    org_id: orgId,
    issue_id: issueId,
    file_name: file.name,
    file_path: path,
    file_size: file.size,
    content_type: file.type || null,
    uploaded_by: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath(`/tickets/${issueId}`)
  return { success: "File uploaded." }
}

export async function removeAttachment(id: string, filePath: string, issueId: string) {
  const supabase = await createClient()
  await supabase.storage.from("attachments").remove([filePath])
  await supabase.from("attachments").delete().eq("id", id)
  revalidatePath(`/tickets/${issueId}`)
}

export async function getAttachmentUrl(filePath: string) {
  const supabase = await createClient()
  const { data } = await supabase.storage.from("attachments").createSignedUrl(filePath, 60 * 10)
  return data?.signedUrl ?? null
}
