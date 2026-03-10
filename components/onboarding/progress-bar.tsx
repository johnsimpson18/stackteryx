"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

export function ProgressBar({ currentStep, totalSteps, labels }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
          Step {currentStep} of {totalSteps}
        </span>
        {labels && (
          <span className="text-xs text-muted-foreground">{labels[currentStep - 1]}</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background:
                i < currentStep
                  ? "oklch(0.65 0.18 250)"
                  : "oklch(0.3 0 0)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
