import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded bg-[#1E1E1E]", className)}
    />
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="h-7 w-48" />
      <Bone className="h-4 w-72" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="rounded-xl border border-[#1E1E1E] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-4 px-4 py-3",
              i > 0 && "border-t border-[#1E1E1E]"
            )}
          >
            <Bone className="h-4 w-4 rounded-full" />
            <Bone className="h-4 flex-1" />
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-[#1E1E1E] p-5 space-y-4">
          <Bone className="h-5 w-32" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-4 w-1/2" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#1E1E1E] p-4 space-y-2">
                <Bone className="h-3 w-16" />
                <Bone className="h-6 w-24" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#1E1E1E] p-5 space-y-3">
            <Bone className="h-5 w-40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Bone key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <HeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[#1E1E1E] p-5 space-y-4">
          <Bone className="h-5 w-36" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Bone className="h-3 w-20" />
              <Bone className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PageSkeletonProps {
  variant: "list" | "detail" | "settings";
}

export function PageSkeleton({ variant }: PageSkeletonProps) {
  switch (variant) {
    case "list":
      return <ListSkeleton />;
    case "detail":
      return <DetailSkeleton />;
    case "settings":
      return <SettingsSkeleton />;
  }
}
