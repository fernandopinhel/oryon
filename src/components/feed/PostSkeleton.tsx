export default function PostSkeleton() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted rounded w-36" />
          <div className="h-3 bg-muted rounded w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-muted rounded" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/6" />
      </div>
      <div className="flex gap-4">
        <div className="h-8 bg-muted rounded w-20" />
        <div className="h-8 bg-muted rounded w-20" />
      </div>
    </div>
  )
}
