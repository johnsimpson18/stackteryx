import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Metric cards (4) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Intelligence cards (2×2) */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
            style={{ minHeight: 160 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="space-y-3 mt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Attention feed */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 py-3">
              <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-7 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by service */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-3 w-28" />
              <div className="flex-1">
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio health */}
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-2.5"
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-20 rounded" />
              <div className="flex gap-1 w-[200px]">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1 rounded-sm" />
                ))}
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
