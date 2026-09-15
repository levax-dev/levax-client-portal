"use client"

import { useActionState, useRef, useTransition } from "react"
import { Download, Paperclip, Trash2, Upload } from "lucide-react"

import { removeAttachment, uploadAttachment, type ActionState } from "@/app/actions/attachments"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Attachment } from "@/types/database"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const initialState: ActionState = null

export function AttachmentsPanel({
  issueId,
  orgId,
  attachments,
}: {
  issueId: string
  orgId: string
  attachments: (Attachment & { url: string | null })[]
}) {
  const [state, action, isUploading] = useActionState(uploadAttachment, initialState)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <Paperclip className="size-4" />
          Attachments ({attachments.length})
        </h2>
        <form ref={formRef} action={action} className="flex items-center gap-2">
          <input type="hidden" name="issueId" value={issueId} />
          <input type="hidden" name="orgId" value={orgId} />
          <input
            type="file"
            name="file"
            id="file-upload"
            className="hidden"
            disabled={isUploading}
            onChange={() => formRef.current?.requestSubmit()}
          />
          <label
            htmlFor="file-upload"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "cursor-pointer",
              isUploading && "pointer-events-none opacity-50"
            )}
          >
            <Upload />
            {isUploading ? "Uploading…" : "Upload"}
          </label>
        </form>
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {attachments.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 truncate">
                <span className="font-medium">{a.file_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{formatBytes(a.file_size)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {a.url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    render={<a href={a.url} target="_blank" rel="noopener noreferrer" download={a.file_name} />}
                  >
                    <Download className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  disabled={isPending}
                  onClick={() => startTransition(() => removeAttachment(a.id, a.file_path, issueId))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
