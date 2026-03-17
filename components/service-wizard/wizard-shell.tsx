"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  saveOutcomeStepAction,
  updateOutcomeStepAction,
  saveServiceStepAction,
  saveStackStepAction,
  saveEconomicsStepAction,
  launchServiceAction,
} from "@/actions/service-wizard";
import { StepOutcome } from "./step-outcome";
import { StepService } from "./step-service";
import { StepStack } from "./step-stack";
import { StepEconomics } from "./step-economics";
import { StepReview } from "./step-review";
import { StepLaunch } from "./step-launch";
import type {
  Tool,
  BundleType,
  RiskTier,
  ServiceOutcome,
  BundleVersion,
  AdditionalService,
  SelectedOutcomeRecord,
} from "@/lib/types";

// ── Wizard form state ────────────────────────────────────────────────────────

export interface WizardFormData {
  // Step 1: Outcome
  name: string;
  outcome_type: "compliance" | "efficiency" | "security" | "growth" | "custom";
  outcome_statement: string;
  target_vertical: string;
  target_persona: string;
  selected_outcomes: SelectedOutcomeRecord[];
  // Step 2: Service Definition
  service_capabilities: { name: string; description: string }[];
  bundle_type: BundleType;
  subtitle: string;
  compliance_frameworks: string[];
  // Step 3: Stack
  selectedToolIds: Set<string>;
  toolQuantities: Record<string, number>;
  // Step 4: Economics
  seat_count: number;
  risk_tier: RiskTier;
  contract_term_months: number;
  target_margin_pct: number;
  overhead_pct: number;
  labor_pct: number;
  discount_pct: number;
  selectedAdditionalServiceIds: Set<string>;
  additionalServiceOverrides: Record<string, { cost?: number; sell_price?: number }>;
  toolCostOverrides: Record<string, number>;
  sell_strategy: "cost_plus_margin" | "monthly_flat_rate" | "per_endpoint_monthly" | "per_user_monthly";
  sell_config: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  // Tracked IDs
  bundleId: string | null;
  versionId: string | null;
}

const DEFAULTS: WizardFormData = {
  name: "",
  outcome_type: "security",
  outcome_statement: "",
  target_vertical: "",
  target_persona: "",
  selected_outcomes: [],
  service_capabilities: [],
  bundle_type: "custom",
  subtitle: "",
  compliance_frameworks: [],
  selectedToolIds: new Set(),
  toolQuantities: {},
  seat_count: 25,
  risk_tier: "medium",
  contract_term_months: 12,
  target_margin_pct: 0.35,
  overhead_pct: 0.10,
  labor_pct: 0.15,
  discount_pct: 0,
  selectedAdditionalServiceIds: new Set(),
  additionalServiceOverrides: {},
  toolCostOverrides: {},
  sell_strategy: "cost_plus_margin",
  sell_config: {},
  assumptions: {},
  bundleId: null,
  versionId: null,
};

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  "Outcome",
  "Service",
  "Stack",
  "Economics",
  "Review",
  "Launch",
];

// ── Props ────────────────────────────────────────────────────────────────────

interface ServiceWizardShellProps {
  tools: Tool[];
  additionalServices: AdditionalService[];
  defaults: {
    target_margin_pct: number;
    overhead_pct: number;
    labor_pct: number;
    red_zone_margin_pct: number;
    max_discount_no_approval_pct: number;
  };
  activeServiceCount?: number;
  initialData?: {
    bundleId: string;
    bundleName: string;
    step: number;
    outcome: ServiceOutcome | null;
    version: BundleVersion | null;
    versionToolIds: string[];
    bundleType: BundleType;
    subtitle: string | null;
    complianceFrameworks: string[];
  };
}

export function ServiceWizardShell({
  tools,
  additionalServices,
  defaults: pricingDefaults,
  activeServiceCount = 0,
  initialData,
}: ServiceWizardShellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(() =>
    initialData ? Math.max(1, Math.min(initialData.step, TOTAL_STEPS)) : 1
  );
  const [launched, setLaunched] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [showOutcomeSkipWarning, setShowOutcomeSkipWarning] = useState(false);
  const outcomeSkipConfirmedRef = useRef(false);

  const [form, setForm] = useState<WizardFormData>(() => {
    const d = { ...DEFAULTS };
    d.target_margin_pct = pricingDefaults.target_margin_pct;
    d.overhead_pct = pricingDefaults.overhead_pct;
    d.labor_pct = pricingDefaults.labor_pct;

    if (initialData) {
      d.bundleId = initialData.bundleId;
      d.bundle_type = initialData.bundleType;
      d.subtitle = initialData.subtitle ?? "";
      d.compliance_frameworks = initialData.complianceFrameworks ?? [];

      d.name = initialData.bundleName;

      if (initialData.outcome) {
        d.outcome_type = (initialData.outcome.outcome_type as WizardFormData["outcome_type"]) || "security";
        d.outcome_statement = initialData.outcome.outcome_statement ?? "";
        d.target_vertical = initialData.outcome.target_vertical ?? "";
        d.target_persona = initialData.outcome.target_persona ?? "";
        d.selected_outcomes = initialData.outcome.selected_outcomes ?? [];
        d.service_capabilities = (initialData.outcome.service_capabilities ?? []).map((c) => ({
          name: c.name,
          description: c.description,
        }));
      }

      if (initialData.versionToolIds.length > 0) {
        d.selectedToolIds = new Set(initialData.versionToolIds);
      }

      if (initialData.version) {
        d.seat_count = initialData.version.seat_count;
        d.risk_tier = initialData.version.risk_tier;
        d.contract_term_months = initialData.version.contract_term_months;
        d.target_margin_pct = initialData.version.target_margin_pct;
        d.overhead_pct = initialData.version.overhead_pct;
        d.labor_pct = initialData.version.labor_pct;
        d.discount_pct = initialData.version.discount_pct;
        d.versionId = initialData.version.id;
      }

      // Restore sell_strategy/sell_config on resume (Bug 4 fix)
      if (initialData.version?.sell_strategy) {
        d.sell_strategy = initialData.version.sell_strategy as WizardFormData["sell_strategy"];
        d.sell_config = (initialData.version.sell_config as unknown as Record<string, unknown>) ?? {};
      }
    }

    return d;
  });

  const update = useCallback(<K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return form.name.trim().length > 0 && form.outcome_type.length > 0;
      case 2:
        return form.service_capabilities.length > 0;
      case 3:
        return true; // Allow advancing with zero tools (user gets warning toast)
      case 4:
        return form.seat_count > 0 && form.selectedToolIds.size > 0;
      case 5:
        return true; // review is read-only
      case 6:
        return true;
      default:
        return true;
    }
  };

  // ── Save per step ───────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!canContinue()) return;

    // Show skip warning if no outcomes on step 1 (unless already confirmed)
    if (
      step === 1 &&
      !outcomeSkipConfirmedRef.current &&
      form.selected_outcomes.length === 0 &&
      !form.outcome_statement.trim()
    ) {
      setShowOutcomeSkipWarning(true);
      return;
    }
    setShowOutcomeSkipWarning(false);
    outcomeSkipConfirmedRef.current = false;

    startTransition(async () => {
      try {
        switch (step) {
          case 1: {
            const outcomeData = {
              name: form.name,
              outcome_type: form.outcome_type,
              outcome_statement: form.outcome_statement,
              target_vertical: form.target_vertical,
              target_persona: form.target_persona,
              selected_outcomes: form.selected_outcomes,
            };

            if (form.bundleId) {
              const result = await updateOutcomeStepAction(form.bundleId, outcomeData);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
            } else {
              const result = await saveOutcomeStepAction(outcomeData);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              setForm((prev) => ({ ...prev, bundleId: result.data.bundleId }));
            }
            break;
          }

          case 2: {
            if (!form.bundleId) return;
            const result = await saveServiceStepAction(form.bundleId, {
              service_capabilities: form.service_capabilities,
              bundle_type: form.bundle_type,
              subtitle: form.subtitle,
              compliance_frameworks: form.compliance_frameworks,
            });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            break;
          }

          case 3: {
            if (!form.bundleId) return;
            const toolsArr = Array.from(form.selectedToolIds).map((id) => ({
              tool_id: id,
              quantity_multiplier: form.toolQuantities[id] ?? 1,
            }));
            const result = await saveStackStepAction(form.bundleId, { tools: toolsArr });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            break;
          }

          case 4: {
            if (!form.bundleId) return;
            const toolsArr = Array.from(form.selectedToolIds).map((id) => ({
              tool_id: id,
              quantity_multiplier: form.toolQuantities[id] ?? 1,
            }));
            const result = await saveEconomicsStepAction(form.bundleId, {
              seat_count: form.seat_count,
              risk_tier: form.risk_tier,
              contract_term_months: form.contract_term_months,
              target_margin_pct: form.target_margin_pct,
              overhead_pct: form.overhead_pct,
              labor_pct: form.labor_pct,
              discount_pct: form.discount_pct,
              tools: toolsArr,
              additional_service_ids: Array.from(form.selectedAdditionalServiceIds),
              additional_service_overrides: form.additionalServiceOverrides,
              sell_strategy: form.sell_strategy,
              sell_config: form.sell_config,
              assumptions: form.assumptions,
              tool_cost_overrides: form.toolCostOverrides,
            });
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            setForm((prev) => ({ ...prev, versionId: result.data.versionId }));
            break;
          }

          // Step 5 (Review) — no save, just advance
          case 5:
            break;
        }
      } catch {
        toast.error("Failed to save. Please try again.");
        return;
      }

      if (step < TOTAL_STEPS) {
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      }
    });
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleJumpToStep = (targetStep: number) => {
    if (targetStep >= 1 && targetStep <= TOTAL_STEPS) {
      setStep(targetStep);
    }
  };

  const handleLaunch = () => {
    if (!form.bundleId) return;
    startTransition(async () => {
      const result = await launchServiceAction(form.bundleId!);
      if (result.success) {
        setLaunched(true);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleExit = () => {
    if (form.bundleId) {
      setExitOpen(true);
    } else {
      router.push("/dashboard");
    }
  };

  const confirmExit = () => {
    setExitOpen(false);
    router.push("/dashboard");
  };

  // ── Progress ────────────────────────────────────────────────────────────────

  const progress = step / TOTAL_STEPS;

  return (
    <div className="flex min-h-screen flex-col app-grid-bg bg-background">
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6 bg-background">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center justify-center h-8 w-8 rounded-md transition-colors hover:bg-white/10"
            title="Exit wizard"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-lg font-display font-bold tracking-tight text-primary">
            STACKTERYX
          </span>
        </div>

        <div className="flex items-center gap-3">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isComplete = stepNum < step;
            return (
              <span
                key={label}
                className={cn(
                  "text-xs font-mono tracking-wide transition-colors",
                  isActive ? "text-primary font-semibold" : isComplete ? "text-muted-foreground" : "text-[#333333]"
                )}
              >
                {label}
              </span>
            );
          })}
        </div>

        <div className="w-48">
          <div className="h-1 w-full rounded-full bg-[#1E1E1E]">
            <div
              className="h-1 rounded-full transition-all duration-300 ease-out bg-primary"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Step content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-start justify-center pt-20 pb-24 px-6">
        <div className="w-full" style={{ maxWidth: step === 4 ? 960 : 720 }}>
          {step === 1 && (
            <StepOutcome
              name={form.name}
              outcomeType={form.outcome_type}
              outcomeStatement={form.outcome_statement}
              targetVertical={form.target_vertical}
              targetPersona={form.target_persona}
              selectedOutcomes={form.selected_outcomes}
              onNameChange={(v) => update("name", v)}
              onOutcomeTypeChange={(v) => update("outcome_type", v)}
              onOutcomeStatementChange={(v) => update("outcome_statement", v)}
              onTargetVerticalChange={(v) => update("target_vertical", v)}
              onTargetPersonaChange={(v) => update("target_persona", v)}
              onSelectedOutcomesChange={(v) => update("selected_outcomes", v)}
              showSkipWarning={showOutcomeSkipWarning}
              onDismissSkipWarning={() => {
                outcomeSkipConfirmedRef.current = true;
                setShowOutcomeSkipWarning(false);
                handleContinue();
              }}
            />
          )}
          {step === 2 && (
            <StepService
              capabilities={form.service_capabilities}
              bundleType={form.bundle_type}
              outcomeType={form.outcome_type}
              outcomeName={form.name}
              outcomeStatement={form.outcome_statement}
              selectedOutcomeIds={form.selected_outcomes.map((o) => o.id)}
              subtitle={form.subtitle}
              complianceFrameworks={form.compliance_frameworks}
              onCapabilitiesChange={(v) => update("service_capabilities", v)}
              onBundleTypeChange={(v) => update("bundle_type", v)}
              onNameChange={(v) => update("name", v)}
              onSubtitleChange={(v) => update("subtitle", v)}
              onComplianceFrameworksChange={(v) => update("compliance_frameworks", v)}
            />
          )}
          {step === 3 && (
            <StepStack
              tools={tools}
              selectedToolIds={form.selectedToolIds}
              onToggle={(id) => {
                setForm((prev) => {
                  const next = new Set(prev.selectedToolIds);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return { ...prev, selectedToolIds: next };
                });
              }}
              onSkipTools={() => {
                toast.info("You can add tools later — your pricing will be estimated until tools are added.");
                handleContinue();
              }}
            />
          )}
          {step === 4 && (
            <StepEconomics
              tools={tools}
              selectedToolIds={form.selectedToolIds}
              additionalServices={additionalServices}
              selectedAdditionalServiceIds={form.selectedAdditionalServiceIds}
              seatCount={form.seat_count}
              riskTier={form.risk_tier}
              contractTermMonths={form.contract_term_months}
              targetMarginPct={form.target_margin_pct}
              overheadPct={form.overhead_pct}
              laborPct={form.labor_pct}
              discountPct={form.discount_pct}
              redZoneMarginPct={pricingDefaults.red_zone_margin_pct}
              maxDiscountNoApprovalPct={pricingDefaults.max_discount_no_approval_pct}
              toolQuantities={form.toolQuantities}
              onSeatCountChange={(v) => update("seat_count", v)}
              onRiskTierChange={(v) => update("risk_tier", v)}
              onContractTermChange={(v) => update("contract_term_months", v)}
              onTargetMarginChange={(v) => update("target_margin_pct", v)}
              onOverheadChange={(v) => update("overhead_pct", v)}
              onLaborChange={(v) => update("labor_pct", v)}
              onDiscountChange={(v) => update("discount_pct", v)}
              additionalServiceOverrides={form.additionalServiceOverrides}
              onAdditionalServicesChange={(ids) => {
                setForm((prev) => ({ ...prev, selectedAdditionalServiceIds: ids }));
              }}
              onAdditionalServiceOverridesChange={(overrides) => {
                setForm((prev) => ({ ...prev, additionalServiceOverrides: overrides }));
              }}
              sellStrategy={form.sell_strategy}
              sellConfig={form.sell_config}
              onSellStrategyChange={(v) => update("sell_strategy", v)}
              onSellConfigChange={(v) => update("sell_config", v)}
              toolCostOverrides={form.toolCostOverrides}
              onToolCostOverridesChange={(overrides) => update("toolCostOverrides", overrides)}
            />
          )}
          {step === 5 && (
            <StepReview
              form={form}
              tools={tools}
              additionalServices={additionalServices}
              launched={launched}
              onEditStep={handleJumpToStep}
            />
          )}
          {step === 6 && (
            <StepLaunch
              launched={launched}
              isPending={isPending}
              bundleId={form.bundleId}
              onLaunch={handleLaunch}
              activeServiceCount={activeServiceCount}
            />
          )}
        </div>
      </main>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      {step < 6 && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 bg-background border-t border-border">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#CCCCCC] transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue() || isPending}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed",
              canContinue() && !isPending ? "bg-primary text-primary-foreground" : "bg-[#333333] text-muted-foreground"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {step === 5 ? "Continue to Launch" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </footer>
      )}

      {/* Exit confirmation dialog */}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exit wizard?</DialogTitle>
            <DialogDescription>
              Your progress has been saved as a draft. You can resume building this service anytime from the Services page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitOpen(false)}>
              Keep Building
            </Button>
            <Button variant="destructive" onClick={confirmExit}>
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
