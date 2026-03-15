import { Skeleton } from "@/components/ui/skeleton";

export default function PricingLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <div className="flex gap-8">
            {["w-24", "w-20", "w-20", "w-16", "w-16", "w-16"].map((w, i) => (
              <Skeleton key={i} className={`h-3 ${w}`} />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-4 py-3.5 last:border-b-0">
            <div className="flex items-center gap-8">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
