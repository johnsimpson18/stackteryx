import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-72 rounded-lg" />

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
      </div>

      {/* Service rows */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex gap-6">
            {["w-20", "w-14", "w-16", "w-14", "w-40", "w-10", "w-14"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-40 flex-1" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <div className="flex gap-1 w-[200px]">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-5 flex-1 rounded-sm" />
                ))}
              </div>
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
