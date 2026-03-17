import { Skeleton } from "@/components/ui/skeleton";

export default function StackBuilderLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Three-panel skeleton */}
      <div className="hidden md:grid grid-cols-[240px_1fr_260px] gap-0 border rounded-xl overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left panel */}
        <div className="border-r border-border p-3 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>

        {/* Center panel */}
        <div className="p-4">
          <Skeleton className="h-5 w-24 mb-2" />
          <Skeleton className="h-4 w-40 mb-4" />
          <div className="rounded-xl border-2 border-dashed border-border/50 h-[60%] flex items-center justify-center">
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Right panel */}
        <div className="border-l border-border p-3 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
