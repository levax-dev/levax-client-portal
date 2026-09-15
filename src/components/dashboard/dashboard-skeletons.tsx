import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-14" />
      </CardContent>
    </Card>
  )
}

export function BreakdownSkeleton() {
  return <Skeleton className="h-8 w-56" />
}

export function ContributionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function ActivitySkeleton() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}
