"use client"

import { useActionState, useState, useTransition } from "react"
import { Download, Paperclip, Plus, Trash2, X } from "lucide-react"

import { removeAttachment, uploadAttachment, type ActionState } from "@/app/actions/attachments"
import { FilePicker } from "@/components/tickets/file-picker"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/uploads"
import type { Attachment } from "@/types/database"

const initialState: ActionState = null

export function AttachmentsPanel({
  issueId,
  orgId,
  attachments,
}: {
  issueId: string
  orgId: string
  /** Deletion is per file: your own always, anyone's if you're staff. */
  attachments: (Attachment & { url: string | null; canDelete: boolean })[]
}) {
  const [state, action, isUploading] = useActionState(uploadAttachment, initialState)
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [filesValid, setFilesValid] = useState(true)
  // Collapse the picker once an upload lands. Adjusting during render off the
  // result identity avoids an effect whose only job is a second render.
  const [lastResult, setLastResult] = useState(state)
  if (state !== lastResult) {
    setLastResult(state)
    if (state?.success) setAdding(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4" />
          Attachments ({attachments.length})
        </h2>
        <Button variant="outline" size="sm" onClick={() => setAdding((open) => !open)}>
          {adding ? <X /> : <Plus />}
          {adding ? "Cancel" : "Add files"}
        </Button>
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* The picker unmounts with the form on success, so it comes back empty. */}
      {adding && (
        <form action={action} className="space-y-3">
          <input type="hidden" name="issueId" value={issueId} />
          <input type="hidden" name="orgId" value={orgId} />
          <FilePicker
            disabled={isUploading}
            onValidityChange={setFilesValid}
          />
          <SubmitButton size="sm" pendingText="Uploading…" disabled={!filesValid}>
            Upload
          </SubmitButton>
        </form>
      )}

      {attachments.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 truncate">
                <span className="font-medium">{a.file_name}</span>
                <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                  {formatBytes(a.file_size)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Download ${a.file_name}`}
                    render={
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={a.file_name}
                      />
                    }
                  >
                    <Download className="size-3.5" />
                  </Button>
                )}
                {a.canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    aria-label={`Delete ${a.file_name}`}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => removeAttachment(a.id, a.file_path, issueId))
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      )}
    </div>
  )
}
