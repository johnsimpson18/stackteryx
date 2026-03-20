"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing";
import { PLAN_LIMITS, PLAN_DISPLAY, type LimitKey } from "@/lib/plans";
import { Loader2, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Context for opening the modal from anywhere ─────────────────────────────

interface UpgradeModalContextValue {
  openUpgradeModal: (limitKey?: LimitKey) => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue>({
  openUpgradeModal: () => {},
});

export function useUpgradeModal() {
  return useContext(UpgradeModalContext);
}

// ── Limit display names ─────────────────────────────────────────────────────

const LIMIT_LABELS: Record<string, string> = {
  services: "services",
  clients: "clients",
  aiGenerationsPerMonth: "AI generations",
  exportsPerMonth: "exports",
  ctoBriefsTotalEver: "CTO briefs",
  teamMembers: "team members",
};

// ── Usage limit rows ────────────────────────────────────────────────────────

function fmt(val: number, suffix?: string): string {
  if (val === Infinity) return "Unlimited";
  return suffix ? `${val} ${suffix}` : String(val);
}

const USAGE_ROWS: {
  label: string;
  free: string;
  pro: string;
  enterprise: string;
}[] = [
  {
    label: "Services",
    free: fmt(PLAN_LIMITS.free.services),
    pro: fmt(PLAN_LIMITS.pro.services),
    enterprise: fmt(PLAN_LIMITS.enterprise.services),
  },
  {
    label: "Clients",
    free: fmt(PLAN_LIMITS.free.clients),
    pro: fmt(PLAN_LIMITS.pro.clients),
    enterprise: fmt(PLAN_LIMITS.enterprise.clients),
  },
  {
    label: "AI generations / month",
    free: fmt(PLAN_LIMITS.free.aiGenerationsPerMonth),
    pro: fmt(PLAN_LIMITS.pro.aiGenerationsPerMonth),
    enterprise: fmt(PLAN_LIMITS.enterprise.aiGenerationsPerMonth),
  },
  {
    label: "Exports / month",
    free: fmt(PLAN_LIMITS.free.exportsPerMonth),
    pro: fmt(PLAN_LIMITS.pro.exportsPerMonth),
    enterprise: fmt(PLAN_LIMITS.enterprise.exportsPerMonth),
  },
  {
    label: "CTO briefs",
    free: "1 ever",
    pro: "10 / month",
    enterprise: fmt(PLAN_LIMITS.enterprise.ctoBriefsTotalEver),
  },
  {
    label: "Team members",
    free: fmt(PLAN_LIMITS.free.teamMembers),
    pro: fmt(PLAN_LIMITS.pro.teamMembers),
    enterprise: fmt(PLAN_LIMITS.enterprise.teamMembers),
  },
];

// ── Premium feature rows ────────────────────────────────────────────────────

const PREMIUM_ROWS: {
  label: string;
  free: boolean;
  pro: boolean;
  enterprise: boolean;
  comingSoon?: boolean;
}[] = [
  { label: "Branded PDF & Word exports", free: false, pro: true, enterprise: true },
  { label: "Sales Studio + proposal generation", free: false, pro: true, enterprise: true },
  { label: "Fractional CTO advisory briefs", free: false, pro: true, enterprise: true },
  { label: "Portfolio intelligence engine", free: false, pro: false, enterprise: true },
  { label: "QBR generator", free: false, pro: false, enterprise: true, comingSoon: true },
  { label: "Client scorecards", free: false, pro: false, enterprise: true, comingSoon: true },
  { label: "Bulk client analysis", free: false, pro: false, enterprise: true, comingSoon: true },
  { label: "White-label exports (no Stackteryx)", free: false, pro: false, enterprise: true },
  { label: "Team workflows & approvals", free: false, pro: false, enterprise: true, comingSoon: true },
  { label: "Priority support", free: false, pro: false, enterprise: true },
];

// ── Tier descriptions ───────────────────────────────────────────────────────

const TIER_DESC = {
  free: "Try the platform. Evaluate before you commit.",
  pro: "For solo MSPs running a real services practice.",
  enterprise: "For growing teams delivering advisory at scale.",
} as const;

type PaidTier = "pro" | "enterprise";

// ── Provider + Modal ────────────────────────────────────────────────────────

export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [limitKey, setLimitKey] = useState<LimitKey | undefined>();
  const [selectedTier, setSelectedTier] = useState<PaidTier>("pro");
  const [pendingPlan, setPendingPlan] = useState<PaidTier | null>(null);
  const [isPending, startTransition] = useTransition();

  const openUpgradeModal = useCallback((key?: LimitKey) => {
    setLimitKey(key);
    setSelectedTier("pro");
    setOpen(true);
  }, []);

  function handleUpgrade(plan: PaidTier) {
    setPendingPlan(plan);
    startTransition(async () => {
      try {
        const { url } = await createCheckoutSession(plan);
        window.location.href = url;
      } catch (err) {
        console.error("[STRIPE] Checkout creation failed:", err);
        toast.error("Could not start checkout. Please try again.");
        setPendingPlan(null);
      }
    });
  }

  function FeatureIcon({ included }: { included: boolean }) {
    return included ? (
      <Check className="h-3.5 w-3.5" style={{ color: "#5a9e00" }} />
    ) : (
      <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
    );
  }

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="p-0 gap-0 border-border/50 overflow-y-auto max-h-[90vh]"
          style={{ maxWidth: 780 }}
        >
          {/* ── Header ───────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-1">
              Upgrade your plan
            </p>
            <DialogTitle className="text-xl font-medium text-foreground">
              Choose the right plan for your practice
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-1">
              Stackteryx helps MSPs design, price, and sell profitable managed
              services.
            </p>

            {limitKey && LIMIT_LABELS[limitKey] && (
              <div
                className="mt-3 text-sm rounded-lg px-3 py-2 border"
                style={{
                  backgroundColor: "rgba(200,241,53,0.08)",
                  borderColor: "rgba(200,241,53,0.2)",
                }}
              >
                You&apos;ve reached the{" "}
                <strong>{LIMIT_LABELS[limitKey]}</strong> limit on your current
                plan.
              </div>
            )}
          </div>

          {/* ── Tier cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6">
            {(["free", "pro", "enterprise"] as const).map((tier) => {
              const isSelected =
                tier === "free" ? false : selectedTier === tier;
              const isPaid = tier !== "free";

              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => isPaid && setSelectedTier(tier as PaidTier)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all duration-150",
                    isPaid && "cursor-pointer",
                    !isPaid && "cursor-default",
                  )}
                  style={{
                    outline: isSelected
                      ? "2px solid #c8f135"
                      : "2px solid transparent",
                    backgroundColor: isSelected
                      ? "rgba(200,241,53,0.12)"
                      : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (isPaid && !isSelected) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(200,241,53,0.08)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                      {PLAN_DISPLAY[tier].label}
                    </span>
                    {tier === "pro" && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "#c8f135",
                          color: "#2a4500",
                        }}
                      >
                        Most popular
                      </span>
                    )}
                    {tier === "enterprise" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Best for scale
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-lg font-bold text-foreground">
                      {PLAN_DISPLAY[tier].price}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      / {PLAN_DISPLAY[tier].period}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {TIER_DESC[tier]}
                  </p>
                </button>
              );
            })}
          </div>

          {/* ── Usage limits table ─────────────────────────────── */}
          <div className="px-6 pt-5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
              Usage limits
            </p>
            <div className="rounded-lg border overflow-hidden">
              {USAGE_ROWS.map((row, idx) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-[minmax(0,200px)_1fr_1fr_1fr] items-center text-sm transition-colors",
                    idx !== USAGE_ROWS.length - 1 && "border-b border-border/50",
                  )}
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(200,241,53,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "";
                  }}
                >
                  <span className="px-3 py-2.5 text-muted-foreground text-[13px]">
                    {row.label}
                  </span>
                  <span className="px-3 py-2.5 text-center text-muted-foreground text-[13px]">
                    {row.free}
                  </span>
                  <span className="px-3 py-2.5 text-center text-foreground text-[13px] font-medium">
                    {row.pro}
                  </span>
                  <span className="px-3 py-2.5 text-center text-foreground text-[13px]">
                    {row.enterprise}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Premium features table ─────────────────────────── */}
          <div className="px-6 pt-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
              Premium features
            </p>
            <div className="rounded-lg border overflow-hidden">
              {PREMIUM_ROWS.map((row, idx) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-[minmax(0,200px)_1fr_1fr_1fr] items-center text-sm transition-colors",
                    idx !== PREMIUM_ROWS.length - 1 &&
                      "border-b border-border/50",
                  )}
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "rgba(200,241,53,0.07)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "";
                  }}
                >
                  <span className="px-3 py-2.5 text-muted-foreground text-[13px] flex items-center gap-1.5">
                    {row.label}
                    {row.comingSoon && (
                      <span
                        className="text-[10px] rounded px-1.5 py-0.5 shrink-0"
                        style={{ background: "#1a1a1a", border: "1px solid #333", color: "#888" }}
                      >
                        Soon
                      </span>
                    )}
                  </span>
                  <span className="px-3 py-2.5 flex justify-center">
                    <FeatureIcon included={row.free} />
                  </span>
                  <span className="px-3 py-2.5 flex justify-center">
                    <FeatureIcon included={row.pro} />
                  </span>
                  <span className="px-3 py-2.5 flex justify-center">
                    <FeatureIcon included={row.enterprise} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTA button row ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 pt-5">
            <Button
              variant="outline"
              className="w-full transition-all hover:opacity-85 active:scale-[0.99]"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Stay on free
            </Button>
            <Button
              className="w-full transition-all hover:opacity-85 active:scale-[0.99]"
              style={
                selectedTier === "pro"
                  ? { backgroundColor: "#c8f135", color: "#2a4500", fontWeight: 500 }
                  : undefined
              }
              variant={selectedTier === "pro" ? "default" : "outline"}
              onClick={() => handleUpgrade("pro")}
              disabled={isPending}
            >
              {isPending && pendingPlan === "pro" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>Upgrade to Pro &rarr;</>
              )}
            </Button>
            <Button
              className="w-full transition-all hover:opacity-85 active:scale-[0.99]"
              style={
                selectedTier === "enterprise"
                  ? { backgroundColor: "#c8f135", color: "#2a4500", fontWeight: 500 }
                  : undefined
              }
              variant={selectedTier === "enterprise" ? "default" : "outline"}
              onClick={() => handleUpgrade("enterprise")}
              disabled={isPending}
            >
              {isPending && pendingPlan === "enterprise" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>Upgrade to Enterprise &rarr;</>
              )}
            </Button>
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          <p className="text-center text-[11px] text-muted-foreground px-6 pt-3 pb-5">
            No contracts. Cancel anytime. All plans include core platform
            access.
          </p>
        </DialogContent>
      </Dialog>
    </UpgradeModalContext.Provider>
  );
}
