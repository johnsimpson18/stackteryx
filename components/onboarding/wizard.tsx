"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./progress-bar";
import { StepWorkspace } from "./step-workspace";
import { StepStack } from "./step-stack";
import { StepLaunch } from "./step-launch";
import { completeOnboardingAction } from "@/actions/onboarding";
import type { SellStrategy } from "@/lib/types";

const STORAGE_KEY = "stackteryx_onboarding_state";

const STEP_LABELS = [
  "Your Workspace",
  "Your Stack",
  "Review & Launch",
];

type Step = 1 | 2 | 3;

interface WizardState {
  workspaceName: string;
  displayName: string;
  selectedVendorIds: string[];
  endpointRange: "small" | "smb" | "mid" | "enterprise";
  sellStrategy: SellStrategy;
  targetMarginPct: number;
  overheadPct: number;
  laborPct: number;
  redZonePct: number;
  maxDiscountPct: number;
}

const DEFAULTS: WizardState = {
  workspaceName: "",
  displayName: "",
  selectedVendorIds: [],
  endpointRange: "smb",
  sellStrategy: "cost_plus_margin",
  targetMarginPct: 0.35,
  overheadPct: 0.1,
  laborPct: 0.15,
  redZonePct: 0.15,
  maxDiscountPct: 0.15,
};

export function OnboardingWizard({ defaultDisplayName }: { defaultDisplayName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(1);
  // 3-step wizard
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(() => {
    // Restore persisted state from a previous session if available
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<WizardState>;
          return {
            ...DEFAULTS,
            ...parsed,
            // Always use the server-provided display name as authoritative
            displayName: parsed.displayName || defaultDisplayName || "",
          };
        }
      } catch {
        // Corrupt storage — fall back to defaults
      }
    }
    return { ...DEFAULTS, displayName: defaultDisplayName ?? "" };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota exceeded or unavailable — ignore
    }
  }, [state]);

  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const toggleVendor = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      selectedVendorIds: prev.selectedVendorIds.includes(id)
        ? prev.selectedVendorIds.filter((v) => v !== id)
        : [...prev.selectedVendorIds, id],
    }));
  }, []);

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return state.workspaceName.trim().length >= 2 && state.displayName.trim().length >= 2;
      case 2:
        return true; // Stack selection is optional — they can add tools later
      case 3:
        return true; // Has sensible defaults for all fields
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    // Step 3 is the final step — submit
    setSubmitError(null);
    startTransition(async () => {
      const result = await completeOnboardingAction({
        workspaceName: state.workspaceName.trim(),
        displayName: state.displayName.trim(),
        selectedVendorIds: state.selectedVendorIds,
        endpointRange: state.endpointRange,
        sellStrategy: state.sellStrategy,
        targetMarginPct: state.targetMarginPct,
        overheadPct: state.overheadPct,
        laborPct: state.laborPct,
        redZonePct: state.redZonePct,
        maxDiscountPct: state.maxDiscountPct,
      });

      if (result.success) {
        // Clear persisted wizard state — onboarding done
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        toast.success(
          `Workspace ready — ${result.data.toolCount} tool${result.data.toolCount !== 1 ? "s" : ""} added.`
        );
        router.push(`/services/${result.data.bundleId}?onboarding=complete`);
      } else {
        const errMsg = result.error ?? "Setup failed. Please try again.";
        setSubmitError(errMsg);
        toast.error(errMsg);
      }
    });
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't intercept Enter on step 3 (it has text inputs inside)
    if (e.key === "Enter" && step < 3 && canContinue() && !isPending) handleNext();
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="w-full max-w-2xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-black text-primary-foreground">S</span>
          </div>
          <span className="text-sm font-semibold text-foreground/80">Stackteryx</span>
        </div>
        <ProgressBar
          currentStep={step}
          totalSteps={3}
          labels={STEP_LABELS}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-6 pb-8">
        <div className="py-6">
          {step === 1 && (
            <StepWorkspace
              workspaceName={state.workspaceName}
              displayName={state.displayName}
              onWorkspaceNameChange={(v) => update("workspaceName", v)}
              onDisplayNameChange={(v) => update("displayName", v)}
            />
          )}

          {step === 2 && (
            <StepStack
              selectedVendorIds={state.selectedVendorIds}
              endpointRange={state.endpointRange}
              onToggle={toggleVendor}
            />
          )}

          {step === 3 && (
            <StepLaunch
              workspaceName={state.workspaceName}
              selectedVendorIds={state.selectedVendorIds}
              endpointRange={state.endpointRange}
              sellStrategy={state.sellStrategy}
              targetMarginPct={state.targetMarginPct}
              overheadPct={state.overheadPct}
              laborPct={state.laborPct}
              redZonePct={state.redZonePct}
              maxDiscountPct={state.maxDiscountPct}
              isPending={isPending}
              onEndpointRangeChange={(v) =>
                update("endpointRange", v as WizardState["endpointRange"])
              }
              onSellStrategyChange={(v) => update("sellStrategy", v)}
              onTargetMarginPctChange={(v) => update("targetMarginPct", v)}
              onOverheadPctChange={(v) => update("overheadPct", v)}
              onLaborPctChange={(v) => update("laborPct", v)}
              onRedZonePctChange={(v) => update("redZonePct", v)}
              onMaxDiscountPctChange={(v) => update("maxDiscountPct", v)}
            />
          )}
        </div>

        {/* Error banner (shown only after a failed submit) */}
        {submitError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-3 mt-4">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-300">Setup failed</p>
              <p className="text-xs text-red-400/80 mt-0.5 break-words">{submitError}</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-400/60 hover:text-red-300 transition-colors text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {step === 2 && state.selectedVendorIds.length === 0 && (
              <button
                type="button"
                onClick={handleNext}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canContinue() || isPending}
              className="gap-1.5 min-w-[130px]"
            >
              {step === 3 ? (
                isPending ? (
                  "Setting up…"
                ) : submitError ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </>
                ) : (
                  "Launch Stackteryx"
                )
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
