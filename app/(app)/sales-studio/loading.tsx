import { Skeleton } from "@/components/ui/skeleton";

export default function SalesStudioLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tab bar */}
      <Skeleton className="h-10 w-96 rounded-lg" />

      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
        {/* Right panel */}
        <div className="rounded-xl border border-border p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
