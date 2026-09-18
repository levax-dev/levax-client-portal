/**
 * What may be attached to a ticket.
 *
 * This is an allowlist, not a blocklist of `.exe` and friends: a blocklist is
 * only ever as good as the last extension someone thought of, and the browser
 * will happily run `.hta`, `.jar`, `.scr` or `.vbs` too. Anything not named
 * here is refused, including `.svg` — it is markup, it can carry script, and
 * attachments are served from a signed URL on a Supabase domain.
 *
 * Both halves matter: the extension (which is what a recipient double-clicks)
 * and the MIME type (which is what a browser dispatches on). `content-type`
 * arrives from the client and is trivially forged, so the extension is the
 * source of truth and the MIME type is only a secondary check.
 */

export interface UploadKind {
  label: string
  extensions: string[]
  mimePrefixes: string[]
  maxBytes: number
}

const MB = 1024 * 1024

export const UPLOAD_KINDS: Record<string, UploadKind> = {
  image: {
    label: "Images",
    extensions: ["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "heif", "bmp", "tif", "tiff"],
    mimePrefixes: ["image/"],
    maxBytes: 15 * MB,
  },
  video: {
    label: "Video",
    extensions: ["mp4", "mov", "webm", "m4v", "avi", "mkv"],
    mimePrefixes: ["video/"],
    maxBytes: 50 * MB,
  },
  document: {
    label: "Documents",
    extensions: ["pdf", "doc", "docx", "odt", "rtf", "txt", "md"],
    mimePrefixes: ["application/pdf", "application/msword", "application/vnd.openxmlformats", "text/"],
    maxBytes: 25 * MB,
  },
  spreadsheet: {
    label: "Spreadsheets",
    extensions: ["xls", "xlsx", "xlsm", "ods", "csv", "tsv"],
    mimePrefixes: ["application/vnd.ms-excel", "application/vnd.openxmlformats", "text/csv", "text/"],
    maxBytes: 25 * MB,
  },
  presentation: {
    label: "Presentations",
    extensions: ["ppt", "pptx", "odp"],
    mimePrefixes: ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats"],
    maxBytes: 25 * MB,
  },
  archive: {
    label: "Archives",
    extensions: ["zip"],
    mimePrefixes: ["application/zip", "application/x-zip-compressed"],
    maxBytes: 50 * MB,
  },
}

export const ALLOWED_EXTENSIONS = Object.values(UPLOAD_KINDS).flatMap((k) => k.extensions)

/** `accept` attribute for the file picker — a hint to the user, never the check. */
export const UPLOAD_ACCEPT = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")

export const MAX_UPLOAD_BYTES = Math.max(...Object.values(UPLOAD_KINDS).map((k) => k.maxBytes))

/** Human-readable summary for the upload hint, e.g. "Images, Video, Documents…". */
export const UPLOAD_SUMMARY = Object.values(UPLOAD_KINDS)
  .map((k) => k.label)
  .join(", ")

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase()
}

export function kindForExtension(extension: string): [string, UploadKind] | null {
  for (const [key, kind] of Object.entries(UPLOAD_KINDS)) {
    if (kind.extensions.includes(extension)) return [key, kind]
  }
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

export type UploadCheck = { ok: true; kind: string } | { ok: false; error: string }

/**
 * Validates one file. Runs on the server before anything touches storage; the
 * client runs it too, purely so the user hears about a bad file immediately.
 */
export function checkUpload(file: { name: string; size: number; type?: string }): UploadCheck {
  const extension = fileExtension(file.name)
  if (!extension) {
    return { ok: false, error: `"${file.name}" has no file extension, so we can't tell what it is.` }
  }

  const match = kindForExtension(extension)
  if (!match) {
    return {
      ok: false,
      error: `.${extension} files aren't allowed. You can attach: ${UPLOAD_SUMMARY.toLowerCase()}.`,
    }
  }

  const [kindKey, kind] = match

  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" is empty.` }
  }
  if (file.size > kind.maxBytes) {
    return {
      ok: false,
      error: `"${file.name}" is ${formatBytes(file.size)} — the cap for ${kind.label.toLowerCase()} is ${formatBytes(kind.maxBytes)}.`,
    }
  }

  // A mismatched MIME type usually means a renamed file. Only reject when the
  // browser was confident enough to send one at all.
  const mime = (file.type ?? "").toLowerCase()
  if (mime && !kind.mimePrefixes.some((prefix) => mime.startsWith(prefix))) {
    return { ok: false, error: `"${file.name}" doesn't look like a real .${extension} file.` }
  }

  return { ok: true, kind: kindKey }
}
