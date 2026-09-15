"use client"

import { useActionState, useRef } from "react"
import { formatDistanceToNow } from "date-fns"
import { Lock } from "lucide-react"

import { addComment, type ActionState } from "@/app/actions/issues"
import { SubmitButton } from "@/components/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface Comment {
  id: string
  body: string
  is_internal: boolean
  created_at: string
  author: { id: string; full_name: string | null; avatar_url: string | null } | null
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

const initialState: ActionState = null

export function CommentThread({
  issueId,
  comments,
  currentUserId,
  isStaff,
}: {
  issueId: string
  comments: Comment[]
  currentUserId: string
  isStaff: boolean
}) {
  const [state, action] = useActionState(addComment, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">Activity ({comments.length})</h2>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={cn(
              "flex gap-3 rounded-lg p-3",
              comment.is_internal && "border border-dashed border-amber-500/40 bg-amber-500/5"
            )}
          >
            <Avatar className="size-8 shrink-0">
              {comment.author?.avatar_url && <AvatarImage src={comment.author.avatar_url} />}
              <AvatarFallback className="text-xs">
                {initials(comment.author?.full_name ?? "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {comment.author?.id === currentUserId ? "You" : comment.author?.full_name ?? "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.is_internal && (
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Lock className="size-3" />
                    Internal note
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">No activity yet — be the first to comment.</p>
        )}
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await action(formData)
          formRef.current?.reset()
        }}
        className="space-y-2"
      >
        <input type="hidden" name="issueId" value={issueId} />
        {state?.error && (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
        <Textarea name="body" placeholder="Write a reply…" rows={3} required />
        <div className="flex items-center justify-between">
          {isStaff ? (
            <Label className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
              <Checkbox name="isInternal" />
              Internal note (hidden from client)
            </Label>
          ) : (
            <span />
          )}
          <SubmitButton size="sm" pendingText="Posting…">
            Comment
          </SubmitButton>
        </div>
      </form>
    </div>
  )
}
