export default function RecommendLoading() {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-lg bg-white/8 animate-pulse" />
        <div className="h-4 w-96 rounded bg-white/5 animate-pulse" />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_2fr]">
        {/* Form skeleton */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {[180, 120, 200, 140].map((h, i) => (
            <div key={i} className="rounded-lg bg-white/5 animate-pulse" style={{ height: h }} />
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="h-5 w-20 rounded bg-white/8 animate-pulse" />
              <div className="h-5 w-32 rounded bg-white/8 animate-pulse" />
              <div className="space-y-1.5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-3.5 rounded bg-white/5 animate-pulse" style={{ width: `${85 - j * 10}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
