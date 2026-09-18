"use client"

import { useRef, useState } from "react"
import { FileText, Film, ImageIcon, Paperclip, Sheet, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { UPLOAD_ACCEPT, checkUpload, fileExtension, formatBytes, kindForExtension } from "@/lib/uploads"

const KIND_ICONS: Record<string, typeof FileText> = {
  image: ImageIcon,
  video: Film,
  spreadsheet: Sheet,
  presentation: Sheet,
  document: FileText,
  archive: Paperclip,
}

function iconFor(fileName: string) {
  const match = kindForExtension(fileExtension(fileName))
  return (match && KIND_ICONS[match[0]]) ?? FileText
}

/**
 * Multi-file picker with drag-and-drop.
 *
 * The real `<input type="file">` stays in the DOM and is what the form submits;
 * removing a file rewrites `input.files` through a `DataTransfer` rather than
 * tracking a parallel list, so what the user sees is exactly what gets posted.
 *
 * Validation here is a courtesy — it tells someone immediately that a `.exe`
 * won't fly. The server re-checks every file regardless.
 */
export function FilePicker({
  name = "files",
  disabled,
  onValidityChange,
  className,
}: {
  name?: string
  disabled?: boolean
  onValidityChange?: (valid: boolean) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  function commit(next: File[]) {
    const transfer = new DataTransfer()
    const problems: string[] = []

    for (const file of next) {
      const check = checkUpload({ name: file.name, size: file.size, type: file.type })
      if (check.ok) transfer.items.add(file)
      else problems.push(check.error)
    }

    if (inputRef.current) inputRef.current.files = transfer.files
    const accepted = Array.from(transfer.files)
    setFiles(accepted)
    setErrors(problems)
    onValidityChange?.(problems.length === 0)
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return
    const merged = [...files]
    for (const file of Array.from(incoming)) {
      // Same name and size twice over is a double-drop, not two files.
      if (!merged.some((f) => f.name === file.name && f.size === file.size)) merged.push(file)
    }
    commit(merged)
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-sm">
            Drag files here, or{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => inputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Images, video, PDF, Word, Excel, PowerPoint and zip. Programs and scripts are refused.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          name={name}
          multiple
          accept={UPLOAD_ACCEPT}
          disabled={disabled}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((error) => (
            <li key={error} className="text-sm text-status-critical">
              {error}
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {files.map((file) => {
            const Icon = iconFor(file.name)
            return (
              <li
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => commit(files.filter((f) => f !== file))}
                >
                  <X className="size-3.5" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
