import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AttachmentsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  )
}

export function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-24" />
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-3 rounded-lg p-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function IssueSidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-32" />
        </CardContent>
      </Card>
    </div>
  )
}
