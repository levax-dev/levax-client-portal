import "server-only"

import type { createClient } from "@/lib/supabase/server"
import { checkUpload } from "@/lib/uploads"

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Validates and stores a batch of uploads against an issue.
 *
 * Every file is checked before any of them is written, so a batch with one bad
 * file is rejected whole rather than half-uploaded. Storage paths stay
 * `${org_id}/${issue_id}/…` because the bucket's RLS policies read the org id
 * out of the first path segment.
 */
export async function storeAttachments({
  supabase,
  orgId,
  issueId,
  userId,
  files,
}: {
  supabase: ServerClient
  orgId: string
  issueId: string
  userId: string
  files: File[]
}): Promise<{ error?: string }> {
  const real = files.filter((f) => f instanceof File && f.size > 0)
  if (real.length === 0) return {}

  for (const file of real) {
    const check = checkUpload({ name: file.name, size: file.size, type: file.type })
    if (!check.ok) return { error: check.error }
  }

  const uploaded: string[] = []

  for (const file of real) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${orgId}/${issueId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(path, file, { contentType: file.type || undefined })

    if (uploadError) {
      // Don't leave orphans behind from a partially successful batch.
      if (uploaded.length > 0) await supabase.storage.from("attachments").remove(uploaded)
      return { error: uploadError.message }
    }
    uploaded.push(path)

    const { error } = await supabase.from("attachments").insert({
      org_id: orgId,
      issue_id: issueId,
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      content_type: file.type || null,
      uploaded_by: userId,
    })
    if (error) {
      await supabase.storage.from("attachments").remove(uploaded)
      return { error: error.message }
    }
  }

  return {}
}
