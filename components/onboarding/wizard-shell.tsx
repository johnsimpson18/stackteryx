"use client";

import { useState, useTransition, useCallback } from "react";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import {
  saveOnboardingStepAction,
  saveOnboardingToolsAction,
  saveOnboardingPricingAction,
  updateOrgNameAction,
} from "@/actions/onboarding-wizard";
import { launchStackteryxAction } from "@/actions/onboarding-launch";
import { StepCompany } from "./step-company";
import { StepClients } from "./step-clients";
import { StepServices } from "./step-services";
import { StepTools } from "./step-tools";
import { StepPricing } from "./step-pricing";
import { StepBusiness } from "./step-business";
import { StepTargets } from "./step-targets";
import type { OnboardingProfile, OnboardingToolSelection } from "@/lib/types";

// ── Pricing entry shape ─────────────────────────────────────────────────────

interface ToolPricingEntry {
  billing_basis: string;
  cost_amount: number | null;
  sell_amount: number | null;
  min_commitment: number | null;
  min_units: number | null;
}

// ── Wizard state shape ──────────────────────────────────────────────────────

export interface WizardData {
  // Step 1 — Company
  companyName: string;
  founderName: string;
  founderTitle: string;
  companySize: string;
  geographies: string[];
  // Step 2 — Clients
  verticals: string[];
  clientSizes: string[];
  buyerPersonas: string[];
  // Step 3 — Services
  services: string[];
  servicesCustom: string[];
  // Step 4 — Tools
  tools: Array<{ tool_name: string; vendor_name?: string | null; category: string; is_custom?: boolean }>;
  customTools: Array<{ tool_name: string; category: string }>;
  // Step 5 — Pricing
  toolPricing: Record<string, ToolPricingEntry>;
  // Step 6 — Business Model
  salesModel: string;
  deliveryModels: string[];
  salesTeamType: string;
  // Step 7 — Targets
  targetMarginPct: number;
  complianceTargets: string[];
  additionalContext: string;
  outcomeTargets: string[];
}

const DEFAULTS: WizardData = {
  companyName: "",
  founderName: "",
  founderTitle: "",
  companySize: "",
  geographies: [],
  verticals: [],
  clientSizes: [],
  buyerPersonas: [],
  services: [],
  servicesCustom: [],
  tools: [],
  customTools: [],
  toolPricing: {},
  salesModel: "",
  deliveryModels: [],
  salesTeamType: "",
  targetMarginPct: 35,
  complianceTargets: [],
  additionalContext: "",
  outcomeTargets: [],
};

const TOTAL_STEPS = 7;

interface WizardShellProps {
  defaultOrgName: string;
  defaultDisplayName: string;
  savedProfile: OnboardingProfile | null;
  savedStep: number;
  savedTools: OnboardingToolSelection[];
}

export function WizardShell({
  defaultOrgName,
  defaultDisplayName,
  savedProfile,
  savedStep,
  savedTools,
}: WizardShellProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(() => Math.max(1, Math.min(savedStep, TOTAL_STEPS)));

  const [data, setData] = useState<WizardData>(() => {
    const d = { ...DEFAULTS };
    // Pre-fill from saved profile
    if (savedProfile) {
      d.companySize = savedProfile.company_size ?? "";
      d.geographies = savedProfile.primary_geographies ?? [];
      d.founderName = savedProfile.founder_name ?? defaultDisplayName;
      d.founderTitle = savedProfile.founder_title ?? "";
      d.verticals = savedProfile.target_verticals ?? [];
      d.clientSizes = savedProfile.client_sizes ?? [];
      d.buyerPersonas = savedProfile.buyer_personas ?? [];
      d.services = savedProfile.services_offered ?? [];
      d.servicesCustom = savedProfile.services_custom ?? [];
      d.salesModel = savedProfile.sales_model ?? "";
      d.deliveryModels = savedProfile.delivery_models ?? [];
      d.salesTeamType = savedProfile.sales_team_type ?? "";
      d.targetMarginPct = savedProfile.target_margin_pct ?? 35;
      d.complianceTargets = savedProfile.compliance_targets ?? [];
      d.additionalContext = savedProfile.additional_context ?? "";
    } else {
      d.founderName = defaultDisplayName;
    }
    d.companyName = defaultOrgName || "";

    // Pre-fill tools and pricing from saved tool selections
    if (savedTools.length > 0) {
      d.tools = savedTools
        .filter((t) => !t.is_custom)
        .map((t) => ({
          tool_name: t.tool_name,
          vendor_name: t.vendor_name,
          category: t.category,
          is_custom: false,
        }));
      d.customTools = savedTools
        .filter((t) => t.is_custom)
        .map((t) => ({ tool_name: t.tool_name, category: t.category }));

      const pricing: Record<string, ToolPricingEntry> = {};
      for (const t of savedTools) {
        if (t.pricing_entered || t.cost_amount != null || t.sell_amount != null) {
          pricing[t.tool_name] = {
            billing_basis: t.billing_basis ?? "",
            cost_amount: t.cost_amount,
            sell_amount: t.sell_amount,
            min_commitment: t.min_commitment,
            min_units: t.min_units,
          };
        }
      }
      d.toolPricing = pricing;
    }

    return d;
  });

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── All tools combined (for pricing table) ────────────────────────────────

  const allToolRefs = [
    ...data.tools.map((t) => ({
      tool_name: t.tool_name,
      vendor_name: t.vendor_name,
      category: t.category,
    })),
    ...data.customTools.map((t) => ({
      tool_name: t.tool_name,
      vendor_name: null,
      category: t.category,
    })),
  ];

  // ── Validation ──────────────────────────────────────────────────────────────

  const canContinue = (): boolean => {
    switch (step) {
      case 1:
        return data.companyName.trim().length >= 1;
      case 2:
        return data.verticals.length >= 1;
      case 3:
        return data.services.length >= 1 || data.servicesCustom.length >= 1;
      case 4:
        return data.tools.length >= 1 || data.customTools.length >= 1;
      case 5: {
        // At least one tool has pricing (cost + sell)
        return Object.values(data.toolPricing).some(
          (p) => p.cost_amount != null && p.sell_amount != null
        );
      }
      case 6:
        return data.salesModel.length >= 1;
      case 7:
        return true; // step 7 uses launch button
      default:
        return true;
    }
  };

  // ── Save + Navigate ─────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!canContinue()) return;
    startTransition(async () => {
      try {
        switch (step) {
          case 1:
            await saveOnboardingStepAction(1, {
              company_size: data.companySize || null,
              primary_geographies: data.geographies.length > 0 ? data.geographies : null,
              founder_name: data.founderName || null,
              founder_title: data.founderTitle || null,
            });
            if (data.companyName.trim()) {
              await updateOrgNameAction(data.companyName.trim());
            }
            break;
          case 2:
            await saveOnboardingStepAction(2, {
              target_verticals: data.verticals,
              client_sizes: data.clientSizes.length > 0 ? data.clientSizes : null,
              buyer_personas: data.buyerPersonas.length > 0 ? data.buyerPersonas : null,
            });
            break;
          case 3:
            await saveOnboardingStepAction(3, {
              services_offered: data.services,
              services_custom: data.servicesCustom.length > 0 ? data.servicesCustom : null,
            });
            break;
          case 4: {
            const allTools = [
              ...data.tools,
              ...data.customTools.map((t) => ({
                tool_name: t.tool_name,
                category: t.category,
                is_custom: true,
              })),
            ];
            await saveOnboardingToolsAction(allTools);
            await saveOnboardingStepAction(4, {});
            break;
          }
          case 5: {
            // Re-save tools to include any added in step 5
            const allTools5 = [
              ...data.tools,
              ...data.customTools.map((t) => ({
                tool_name: t.tool_name,
                category: t.category,
                is_custom: true,
              })),
            ];
            await saveOnboardingToolsAction(allTools5);

            // Save pricing for all tools that have data
            const pricingEntries = Object.entries(data.toolPricing)
              .filter(([, p]) => p.cost_amount != null || p.sell_amount != null)
              .map(([toolName, p]) => ({
                tool_name: toolName,
                billing_basis: p.billing_basis || undefined,
                cost_amount: p.cost_amount,
                sell_amount: p.sell_amount,
                min_commitment: p.min_commitment,
                min_units: p.min_units,
              }));
            await saveOnboardingPricingAction(pricingEntries);
            await saveOnboardingStepAction(5, {});
            break;
          }
          case 6:
            await saveOnboardingStepAction(6, {
              sales_model: data.salesModel,
              delivery_models: data.deliveryModels.length > 0 ? data.deliveryModels : null,
              sales_team_type: data.salesTeamType || null,
            });
            break;
          // Step 7 handled by handleLaunch
        }
      } catch {
        // Non-blocking — data will save on next continue
      }

      if (step < TOTAL_STEPS) {
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      }
    });
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleLaunch = () => {
    startTransition(async () => {
      await launchStackteryxAction({
        target_margin_pct: data.targetMarginPct,
        compliance_targets: data.complianceTargets,
        additional_context: data.additionalContext,
        outcome_targets: data.outcomeTargets,
      });
    });
  };

  // ── Progress fraction ───────────────────────────────────────────────────────

  const progress = step / TOTAL_STEPS;

  return (
    <div className="flex min-h-screen flex-col app-grid-bg" style={{ backgroundColor: "#0A0A0A" }}>
      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-6" style={{ backgroundColor: "#0A0A0A" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/stackteryx-logo.svg" alt="Stackteryx" height={28} style={{ height: 28, width: "auto" }} />

        <span
          className="text-xs tracking-widest"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666" }}
        >
          STEP {step} OF {TOTAL_STEPS}
        </span>

        <div className="w-48">
          <div className="h-1 w-full rounded-full" style={{ backgroundColor: "#1E1E1E" }}>
            <div
              className="h-1 rounded-full transition-all duration-300 ease-out"
              style={{ backgroundColor: "#A8FF3E", width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </header>

      {/* ── Step content ──────────────────────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center pt-14 pb-20 px-6">
        <div className="w-full" style={{ maxWidth: 720 }}>
          {step === 1 && (
            <StepCompany
              companyName={data.companyName}
              founderName={data.founderName}
              founderTitle={data.founderTitle}
              companySize={data.companySize}
              geographies={data.geographies}
              onCompanyNameChange={(v) => update("companyName", v)}
              onFounderNameChange={(v) => update("founderName", v)}
              onFounderTitleChange={(v) => update("founderTitle", v)}
              onCompanySizeChange={(v) => update("companySize", v)}
              onGeographiesChange={(v) => update("geographies", v)}
            />
          )}
          {step === 2 && (
            <StepClients
              verticals={data.verticals}
              clientSizes={data.clientSizes}
              buyerPersonas={data.buyerPersonas}
              onVerticalsChange={(v) => update("verticals", v)}
              onClientSizesChange={(v) => update("clientSizes", v)}
              onBuyerPersonasChange={(v) => update("buyerPersonas", v)}
            />
          )}
          {step === 3 && (
            <StepServices
              services={data.services}
              servicesCustom={data.servicesCustom}
              onServicesChange={(v) => update("services", v)}
              onServicesCustomChange={(v) => update("servicesCustom", v)}
            />
          )}
          {step === 4 && (
            <StepTools
              tools={data.tools}
              customTools={data.customTools}
              onToolsChange={(v) => update("tools", v)}
              onCustomToolsChange={(v) => update("customTools", v)}
            />
          )}
          {step === 5 && (
            <StepPricing
              tools={allToolRefs}
              toolPricing={data.toolPricing}
              onToolPricingChange={(p) => update("toolPricing", p)}
              onAddTool={(t) =>
                update("customTools", [...data.customTools, t])
              }
            />
          )}
          {step === 6 && (
            <StepBusiness
              salesModel={data.salesModel}
              deliveryModels={data.deliveryModels}
              salesTeamType={data.salesTeamType}
              onSalesModelChange={(v) => update("salesModel", v)}
              onDeliveryModelsChange={(v) => update("deliveryModels", v)}
              onSalesTeamTypeChange={(v) => update("salesTeamType", v)}
            />
          )}
          {step === 7 && (
            <StepTargets
              targetMarginPct={data.targetMarginPct}
              complianceTargets={data.complianceTargets}
              additionalContext={data.additionalContext}
              outcomeTargets={data.outcomeTargets}
              onTargetMarginPctChange={(v) => update("targetMarginPct", v)}
              onComplianceTargetsChange={(v) => update("complianceTargets", v)}
              onAdditionalContextChange={(v) => update("additionalContext", v)}
              onOutcomeTargetsChange={(v) => update("outcomeTargets", v)}
              review={{
                companyName: data.companyName,
                founderName: data.founderName,
                founderTitle: data.founderTitle,
                companySize: data.companySize,
                geographies: data.geographies,
                verticals: data.verticals,
                clientSizes: data.clientSizes,
                buyerPersonas: data.buyerPersonas,
                services: data.services,
                servicesCustom: data.servicesCustom,
                toolCount: data.tools.length + data.customTools.length,
                salesModel: data.salesModel,
                deliveryModels: data.deliveryModels,
                salesTeamType: data.salesTeamType,
              }}
              onLaunch={handleLaunch}
              isLaunching={isPending}
            />
          )}
        </div>
      </main>

      {/* ── Bottom bar ────────────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6" style={{ backgroundColor: "#0A0A0A", borderTop: "1px solid #1E1E1E" }}>
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-40"
            style={{ color: "#666666" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#CCCCCC"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#666666"; }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue() || isPending}
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed"
            style={{
              backgroundColor: canContinue() && !isPending ? "#A8FF3E" : "#333333",
              color: canContinue() && !isPending ? "#0A0A0A" : "#666666",
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <div />
        )}
      </footer>
    </div>
  );
}
