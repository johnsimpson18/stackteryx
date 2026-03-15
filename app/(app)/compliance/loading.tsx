import { Skeleton } from "@/components/ui/skeleton";

export default function ComplianceLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Tab bar */}
      <Skeleton className="h-10 w-64 rounded-lg" />

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex gap-8">
            {["w-24", "w-24", "w-20", "w-20", "w-16"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-8">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full max-w-[200px] rounded-full" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
