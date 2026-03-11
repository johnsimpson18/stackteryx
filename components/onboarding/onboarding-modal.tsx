"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import {
  saveOnboardingStepAction,
  saveOnboardingToolsAction,
  saveOnboardingPricingAction,
  updateOrgNameAction,
} from "@/actions/onboarding-wizard";
import { saveOnboardingFinalStepAction } from "@/actions/onboarding-launch";
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

// ── Wizard data shape ───────────────────────────────────────────────────────

interface WizardData {
  companyName: string;
  founderName: string;
  founderTitle: string;
  companySize: string;
  geographies: string[];
  verticals: string[];
  clientSizes: string[];
  buyerPersonas: string[];
  services: string[];
  servicesCustom: string[];
  tools: Array<{
    tool_name: string;
    vendor_name?: string | null;
    category: string;
    is_custom?: boolean;
  }>;
  customTools: Array<{ tool_name: string; category: string }>;
  toolPricing: Record<string, ToolPricingEntry>;
  salesModel: string;
  deliveryModels: string[];
  salesTeamType: string;
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

const STEP_NAMES = [
  "Company Profile",
  "Client Profile",
  "Services",
  "Tool Selection",
  "Tool Pricing",
  "Business Model",
  "Targets & Launch",
];

// ── Checklist items for welcome screen ──────────────────────────────────────

const CHECKLIST = [
  {
    label: "Your service catalog",
    sub: "AI generates your first services based on your stack and pricing",
  },
  {
    label: "Your vendor stack",
    sub: "Import or build the tools you deliver to clients",
  },
  {
    label: "Your pricing model",
    sub: "Set margins, labor rates, and overhead — used across all services",
  },
  {
    label: "Your outcome targets",
    sub: "Define the business results your services deliver",
  },
  {
    label: "Your first AI-generated services",
    sub: "Ready to assign to clients and use in proposals",
  },
];

// ── Building screen labels ──────────────────────────────────────────────────

const BUILD_LABELS = [
  "Mapping your outcome types...",
  "Organizing your service capabilities...",
  "Cataloging your stack by domain...",
  "Modeling your cost floor...",
  "Calculating your margin targets...",
  "Scoring your portfolio coverage...",
  "Configuring your intelligence layer...",
  "Your platform is ready.",
];

type BuildStatus = "pending" | "active" | "complete";

// ── Props ───────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
  orgId: string;
  defaultOrgName: string;
  defaultDisplayName: string;
  savedProfile: OnboardingProfile | null;
  savedStep: number;
  savedTools: OnboardingToolSelection[];
  onComplete: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function OnboardingModal({
  orgId,
  defaultOrgName,
  defaultDisplayName,
  savedProfile,
  savedStep,
  savedTools,
  onComplete,
}: OnboardingModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Phase: welcome → wizard → building
  const [phase, setPhase] = useState<"welcome" | "wizard" | "building">(
    "welcome"
  );
  const [transitioning, setTransitioning] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Wizard step
  const [step, setStep] = useState(() =>
    Math.max(1, Math.min(savedStep, TOTAL_STEPS))
  );

  // Building screen state
  const [buildSteps, setBuildSteps] = useState<BuildStatus[]>(
    BUILD_LABELS.map(() => "pending")
  );
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildFading, setBuildFading] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Has partial progress?
  const hasProgress = savedStep > 1;

  // Wizard data
  const [data, setData] = useState<WizardData>(() => {
    const d = { ...DEFAULTS };
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
        if (
          t.pricing_entered ||
          t.cost_amount != null ||
          t.sell_amount != null
        ) {
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

  const update = useCallback(
    <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Mount animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // All tools for pricing table
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

  // ── Phase transitions ───────────────────────────────────────────────────

  function startWizard() {
    setTransitioning(true);
    setTimeout(() => {
      setPhase("wizard");
      setTransitioning(false);
    }, 200);
  }

  // ── Validation ──────────────────────────────────────────────────────────

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
      case 5:
        return Object.values(data.toolPricing).some(
          (p) => p.cost_amount != null && p.sell_amount != null
        );
      case 6:
        return data.salesModel.length >= 1;
      case 7:
        return true;
      default:
        return true;
    }
  };

  // ── Save + Navigate ─────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!canContinue()) return;
    startTransition(async () => {
      try {
        switch (step) {
          case 1:
            await saveOnboardingStepAction(1, {
              company_size: data.companySize || null,
              primary_geographies:
                data.geographies.length > 0 ? data.geographies : null,
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
              client_sizes:
                data.clientSizes.length > 0 ? data.clientSizes : null,
              buyer_personas:
                data.buyerPersonas.length > 0 ? data.buyerPersonas : null,
            });
            break;
          case 3:
            await saveOnboardingStepAction(3, {
              services_offered: data.services,
              services_custom:
                data.servicesCustom.length > 0 ? data.servicesCustom : null,
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
            const allTools5 = [
              ...data.tools,
              ...data.customTools.map((t) => ({
                tool_name: t.tool_name,
                category: t.category,
                is_custom: true,
              })),
            ];
            await saveOnboardingToolsAction(allTools5);
            const pricingEntries = Object.entries(data.toolPricing)
              .filter(
                ([, p]) => p.cost_amount != null || p.sell_amount != null
              )
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
              delivery_models:
                data.deliveryModels.length > 0 ? data.deliveryModels : null,
              sales_team_type: data.salesTeamType || null,
            });
            break;
        }
      } catch {
        // Non-blocking
      }

      if (step < TOTAL_STEPS) {
        setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      }
    });
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  // ── Launch (Step 7) ─────────────────────────────────────────────────────
  // Save step 7 data via server action, then transition to building phase
  // inside the modal (no redirect).

  const handleLaunch = () => {
    startTransition(async () => {
      const result = await saveOnboardingFinalStepAction({
        target_margin_pct: data.targetMarginPct,
        compliance_targets: data.complianceTargets,
        additional_context: data.additionalContext,
        outcome_targets: data.outcomeTargets,
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }

      // Transition to building phase inside the modal
      setPhase("building");
    });
  };

  // ── Building screen EventSource ─────────────────────────────────────────

  useEffect(() => {
    if (phase !== "building") return;

    const es = new EventSource(
      `/api/onboarding/generate?org_id=${encodeURIComponent(orgId)}`
    );
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const d = JSON.parse(event.data);

        if (d.error) {
          setBuildError(d.error);
          es.close();
          return;
        }

        setBuildSteps((prev) => {
          const next = [...prev];
          for (let i = 0; i < d.step - 1; i++) next[i] = "complete";
          next[d.step - 1] = d.status ?? "active";
          return next;
        });

        if (d.done) {
          es.close();
          setTimeout(() => {
            setBuildFading(true);
            setTimeout(() => {
              toast.success("Workspace ready — welcome to Stackteryx");
              onComplete();
              router.refresh();
            }, 500);
          }, 800);
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setBuildError("Connection lost. Please refresh the page.");
    };

    return () => {
      es.close();
    };
  }, [phase, orgId, onComplete, router]);

  // ── Progress fraction ───────────────────────────────────────────────────

  const wizardProgress = step / TOTAL_STEPS;
  const buildCompleted = buildSteps.filter((s) => s === "complete").length;
  const buildProgress = (buildCompleted / BUILD_LABELS.length) * 100;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Modal shell */}
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{
          maxWidth: 720,
          maxHeight: "90vh",
          backgroundColor: "#111111",
          borderColor: "#1E1E1E",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.8)",
        }}
      >
        {/* Top glow line */}
        <div
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, transparent, #A8FF3E60, transparent)",
          }}
        />

        {/* Scrollable content */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 2px)" }}
        >
          {/* ── PHASE: WELCOME ─────────────────────────────────────── */}
          {phase === "welcome" && (
            <div
              className="px-8 py-10 transition-opacity duration-200"
              style={{ opacity: transitioning ? 0 : 1 }}
            >
              {/* Logo */}
              <div className="text-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/stackteryx-logo.svg"
                  alt="Stackteryx"
                  height={36}
                  style={{
                    height: 36,
                    width: "auto",
                    display: "inline-block",
                  }}
                />
              </div>

              {/* Heading */}
              <h1
                className="text-center font-bold uppercase tracking-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#FFFFFF",
                  fontSize: 32,
                }}
              >
                YOUR WORKSPACE IS READY.
              </h1>

              {/* Subheading */}
              <p
                className="text-center mx-auto mt-3"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "#666666",
                  fontSize: 13,
                  maxWidth: 400,
                  lineHeight: 1.6,
                }}
              >
                Before you access the platform, let&apos;s set up your
                workspace. It takes about 5 minutes and unlocks everything.
              </p>

              {/* Checklist */}
              <div className="mt-8 space-y-0">
                {CHECKLIST.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-3"
                    style={{
                      opacity: mounted ? 1 : 0,
                      transform: mounted
                        ? "translateY(0)"
                        : "translateY(8px)",
                      transition: "opacity 300ms ease, transform 300ms ease",
                      transitionDelay: `${100 + i * 60}ms`,
                    }}
                  >
                    {/* Checkbox circle */}
                    <div
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: "#A8FF3E",
                        backgroundColor: "#1E1E1E",
                      }}
                    />

                    <div>
                      <p
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "#CCCCCC",
                          fontSize: 13,
                        }}
                      >
                        {item.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "#444444",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {item.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Time estimate */}
              <p
                className="text-center mt-6"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "#444444",
                  fontSize: 11,
                }}
              >
                ⏱ Most MSPs complete setup in under 5 minutes
              </p>

              {/* Returning user prompt */}
              {hasProgress && (
                <div className="text-center mt-3">
                  <button
                    onClick={startWizard}
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "#A8FF3E",
                      fontSize: 12,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    You started setup — pick up where you left off →
                  </button>
                </div>
              )}

              {/* CTA button */}
              <div
                className="mt-6"
                style={{
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 300ms ease, transform 300ms ease",
                  transitionDelay: "440ms",
                }}
              >
                <button
                  onClick={startWizard}
                  className="w-full rounded-lg py-3 font-bold uppercase tracking-wide transition-colors"
                  style={{
                    fontFamily: "var(--font-display)",
                    backgroundColor: "#A8FF3E",
                    color: "#0A0A0A",
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#90E635";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#A8FF3E";
                  }}
                >
                  {hasProgress ? "CONTINUE SETUP →" : "SET UP MY WORKSPACE →"}
                </button>
              </div>

              {/* Bottom note */}
              <p
                className="text-center mt-4"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "#333333",
                  fontSize: 10,
                }}
              >
                You can refine everything after setup — this gets you started.
              </p>
            </div>
          )}

          {/* ── PHASE: WIZARD ──────────────────────────────────────── */}
          {phase === "wizard" && (
            <div
              className="transition-opacity duration-200"
              style={{ opacity: transitioning ? 0 : 1 }}
            >
              {/* Progress header */}
              <div className="px-6 pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "#A8FF3E",
                      fontSize: 13,
                    }}
                  >
                    {STEP_NAMES[step - 1]}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "#444444",
                      fontSize: 11,
                    }}
                  >
                    STEP {step} OF {TOTAL_STEPS}
                  </span>
                </div>
                <div
                  className="h-1 w-full rounded-full"
                  style={{ backgroundColor: "#1E1E1E" }}
                >
                  <div
                    className="h-1 rounded-full"
                    style={{
                      backgroundColor: "#A8FF3E",
                      width: `${wizardProgress * 100}%`,
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
              </div>

              {/* Step content */}
              <div className="px-6 pb-4">
                <div style={{ maxWidth: 720 }}>
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
                      onServicesCustomChange={(v) =>
                        update("servicesCustom", v)
                      }
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
                      onDeliveryModelsChange={(v) =>
                        update("deliveryModels", v)
                      }
                      onSalesTeamTypeChange={(v) =>
                        update("salesTeamType", v)
                      }
                    />
                  )}
                  {step === 7 && (
                    <StepTargets
                      targetMarginPct={data.targetMarginPct}
                      complianceTargets={data.complianceTargets}
                      additionalContext={data.additionalContext}
                      outcomeTargets={data.outcomeTargets}
                      onTargetMarginPctChange={(v) =>
                        update("targetMarginPct", v)
                      }
                      onComplianceTargetsChange={(v) =>
                        update("complianceTargets", v)
                      }
                      onAdditionalContextChange={(v) =>
                        update("additionalContext", v)
                      }
                      onOutcomeTargetsChange={(v) =>
                        update("outcomeTargets", v)
                      }
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
                        toolCount:
                          data.tools.length + data.customTools.length,
                        salesModel: data.salesModel,
                        deliveryModels: data.deliveryModels,
                        salesTeamType: data.salesTeamType,
                      }}
                      onLaunch={handleLaunch}
                      isLaunching={isPending}
                    />
                  )}
                </div>
              </div>

              {/* Navigation bar */}
              <div
                className="sticky bottom-0 flex items-center justify-between px-6 py-4"
                style={{
                  borderTop: "1px solid #1E1E1E",
                  backgroundColor: "#111111",
                }}
              >
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isPending}
                    className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-40"
                    style={{ color: "#444444" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#CCCCCC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#444444";
                    }}
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
                      backgroundColor:
                        canContinue() && !isPending ? "#A8FF3E" : "#333333",
                      color:
                        canContinue() && !isPending ? "#0A0A0A" : "#666666",
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
              </div>
            </div>
          )}

          {/* ── PHASE: BUILDING ─────────────────────────────────────── */}
          {phase === "building" && (
            <div
              className="px-8 py-10 transition-opacity duration-500"
              style={{ opacity: buildFading ? 0 : 1 }}
            >
              {/* Logo */}
              <div className="text-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/stackteryx-logo.svg"
                  alt="Stackteryx"
                  height={36}
                  style={{
                    height: 36,
                    width: "auto",
                    display: "inline-block",
                  }}
                />
              </div>

              {/* Headline */}
              <h1
                className="text-center font-bold uppercase tracking-tight mb-10"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#FFFFFF",
                  fontSize: 36,
                }}
              >
                BUILDING YOUR STACKTERYX
              </h1>

              {/* Terminal log */}
              <div
                className="rounded-lg border mb-6"
                style={{
                  backgroundColor: "#0A0A0A",
                  borderColor: "#1E1E1E",
                  padding: 24,
                }}
              >
                <div className="space-y-2">
                  {BUILD_LABELS.map((label, i) => {
                    const status = buildSteps[i];
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3"
                        style={{
                          fontFamily: "var(--font-mono-alt)",
                          fontSize: 13,
                        }}
                      >
                        {status === "pending" && (
                          <span
                            style={{
                              color: "#333333",
                              width: 16,
                              textAlign: "center",
                            }}
                          >
                            ○
                          </span>
                        )}
                        {status === "active" && (
                          <span
                            className="animate-pulse"
                            style={{
                              color: "#A8FF3E",
                              width: 16,
                              textAlign: "center",
                            }}
                          >
                            ●
                          </span>
                        )}
                        {status === "complete" && (
                          <span
                            style={{
                              color: "#A8FF3E",
                              width: 16,
                              textAlign: "center",
                            }}
                          >
                            ✓
                          </span>
                        )}
                        <span
                          style={{
                            color:
                              status === "complete"
                                ? "#A8FF3E"
                                : status === "active"
                                  ? "#CCCCCC"
                                  : "#444444",
                          }}
                        >
                          {label}
                          {status === "active" && (
                            <span
                              className="animate-pulse"
                              style={{ color: "#A8FF3E" }}
                            >
                              ▌
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="h-0.5 w-full rounded-full mb-4"
                style={{ backgroundColor: "#1E1E1E" }}
              >
                <div
                  className="h-0.5 rounded-full transition-all duration-500 ease-out"
                  style={{
                    backgroundColor: "#A8FF3E",
                    width: `${buildProgress}%`,
                  }}
                />
              </div>

              {/* Status text */}
              {buildError ? (
                <p
                  className="text-center"
                  style={{
                    fontFamily: "var(--font-mono-alt)",
                    fontSize: 12,
                    color: "#EF4444",
                  }}
                >
                  {buildError}
                </p>
              ) : (
                <p
                  className="text-center"
                  style={{
                    fontFamily: "var(--font-mono-alt)",
                    fontSize: 12,
                    color: "#444444",
                  }}
                >
                  This usually takes about 10 seconds.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
