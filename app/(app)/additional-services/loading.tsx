import { Skeleton } from "@/components/ui/skeleton";

export default function AdditionalServicesLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex gap-6">
            {["w-20", "w-16", "w-14", "w-12", "w-16", "w-14", "w-14", "w-14"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
