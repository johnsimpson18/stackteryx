import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex gap-8">
            {["w-24", "w-20", "w-16", "w-20", "w-14"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-8">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
