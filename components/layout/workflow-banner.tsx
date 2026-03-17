"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Check, ChevronRight } from "lucide-react";

export interface WorkflowSteps {
  hasTools: boolean;
  hasServices: boolean;
  hasClients: boolean;
  hasProposals: boolean;
}

const STEPS = [
  { label: "Add your tools", href: "/stack-catalog", key: "hasTools" as const },
  { label: "Build a service", href: "/services/new", key: "hasServices" as const },
  { label: "Add a client", href: "/clients/new", key: "hasClients" as const },
  { label: "Generate a proposal", href: "/sales-studio", key: "hasProposals" as const },
];

const HIDDEN_PATHS = ["/settings", "/admin", "/compliance"];

interface WorkflowBannerProps {
  steps: WorkflowSteps;
}

export function WorkflowBanner({ steps }: WorkflowBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  const allComplete = steps.hasTools && steps.hasServices && steps.hasClients && steps.hasProposals;
  if (allComplete || dismissed) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  // Find the current (first incomplete) step
  const currentIndex = STEPS.findIndex((s) => !steps[s.key]);
  const currentStep = currentIndex >= 0 ? STEPS[currentIndex] : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground mb-3">
            Getting started with Stackteryx
          </p>

          {/* Step chips */}
          <div className="flex flex-wrap items-center gap-2">
            {STEPS.map((step, i) => {
              const isComplete = steps[step.key];
              const isCurrent = i === currentIndex;

              return (
                <div key={step.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  )}
                  <Link
                    href={step.href}
                    className={
                      isComplete
                        ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground line-through decoration-muted-foreground/40"
                        : isCurrent
                          ? "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                          : "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted/50 text-muted-foreground/70"
                    }
                  >
                    {isComplete && <Check className="h-3 w-3" />}
                    <span>{i + 1}</span>
                    {step.label}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Next step CTA */}
          {currentStep && (
            <p className="text-xs text-muted-foreground mt-3">
              You&apos;re on step {currentIndex + 1}. Next:{" "}
              <Link
                href={currentStep.href}
                className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
              >
                {currentStep.label}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </p>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
