import { CommentThread, type Comment } from "@/components/tickets/comment-thread"
import { createClient } from "@/lib/supabase/server"

export async function CommentsSection({
  issueId,
  currentUserId,
  isStaff,
}: {
  issueId: string
  currentUserId: string
  isStaff: boolean
}) {
  const supabase = await createClient()
  const { data: comments } = await supabase
    .from("issue_comments")
    .select("id, body, is_internal, created_at, author:profiles(id, full_name, avatar_url)")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true })

  return (
    <CommentThread
      issueId={issueId}
      comments={(comments ?? []) as unknown as Comment[]}
      currentUserId={currentUserId}
      isStaff={isStaff}
    />
  )
}
