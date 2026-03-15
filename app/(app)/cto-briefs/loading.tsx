import { Skeleton } from "@/components/ui/skeleton";

export default function CTOBriefsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-52 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Form card */}
        <div className="rounded-xl border border-border p-6 space-y-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>

        {/* History panel */}
        <div className="rounded-xl border border-border p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 py-3 border-b border-border/50 last:border-b-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
