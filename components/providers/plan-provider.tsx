"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  syncSubscriptionWithStripe,
  getOrgUsage,
  type UsageRecord,
} from "@/actions/billing";
import {
  PLAN_LIMITS,
  trialDaysRemaining as computeTrialDays,
  type LimitKey,
  type Plan,
  type PlanLimitValues,
} from "@/lib/plans";

type TrialUrgency = "none" | "low" | "medium" | "high" | "expired";

interface PlanContextValue {
  plan: Plan;
  status: string;
  usage: UsageRecord;
  limits: PlanLimitValues;
  isAtLimit: (key: LimitKey) => boolean;
  refresh: () => void;
  loading: boolean;
  comped: boolean;
  trialEndsAt: string | null;
  trialConverted: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialUrgency: TrialUrgency;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const DEFAULT_USAGE: UsageRecord = {
  aiGenerationsCount: 0,
  exportsCount: 0,
  periodMonth: "",
};

const CLIENT_BYPASS =
  process.env.NEXT_PUBLIC_BYPASS_PLAN_LIMITS === "true" &&
  process.env.NODE_ENV !== "production";

function computeUrgency(days: number, isTrial: boolean): TrialUrgency {
  if (!isTrial) return "none";
  if (days <= 0) return "expired";
  if (days <= 1) return "high";
  if (days <= 2) return "medium";
  if (days <= 4) return "low";
  return "none";
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(CLIENT_BYPASS ? "pro" : "free");
  const [status, setStatus] = useState("active");
  const [usage, setUsage] = useState<UsageRecord>(DEFAULT_USAGE);
  const [loading, setLoading] = useState(!CLIENT_BYPASS);
  const [comped, setComped] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [trialConverted, setTrialConverted] = useState(false);

  const fetchData = useCallback(async () => {
    if (CLIENT_BYPASS) return;
    try {
      const [sub, u] = await Promise.all([
        syncSubscriptionWithStripe(),
        getOrgUsage(),
      ]);
      setPlan(sub.plan);
      setStatus(sub.status);
      setUsage(u);
      setComped(sub.comped);
      setTrialEndsAt(sub.trialEndsAt);
      setTrialConverted(sub.trialConverted);
    } catch {
      // Degrade gracefully — assume free
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const limits = PLAN_LIMITS[plan] as PlanLimitValues;

  const isTrial = plan === "trial";
  const trialDaysRemaining = useMemo(
    () => computeTrialDays(trialEndsAt),
    [trialEndsAt],
  );
  const trialUrgency = useMemo(
    () => computeUrgency(trialDaysRemaining, isTrial),
    [trialDaysRemaining, isTrial],
  );

  const isAtLimit = useCallback(
    (key: LimitKey): boolean => {
      if (CLIENT_BYPASS) return false;
      if (isTrial && trialDaysRemaining > 0) return false; // Active trial — no limits
      const planLimits = PLAN_LIMITS[plan] as PlanLimitValues;
      const val = planLimits[key];
      if (typeof val === "boolean") return !val;
      if (val === Infinity) return false;
      switch (key) {
        case "aiGenerationsPerMonth":
          return usage.aiGenerationsCount >= val;
        case "exportsPerMonth":
          return usage.exportsCount >= val;
        default:
          return false;
      }
    },
    [plan, usage, isTrial, trialDaysRemaining],
  );

  return (
    <PlanContext.Provider
      value={{
        plan,
        status,
        usage,
        limits,
        isAtLimit,
        refresh: fetchData,
        loading,
        comped,
        trialEndsAt,
        trialConverted,
        isTrial,
        trialDaysRemaining,
        trialUrgency,
      }}
    >
      {children}
      {CLIENT_BYPASS && (
        <div className="fixed bottom-3 left-3 z-50 px-2.5 py-1 rounded-md bg-amber-500/90 text-black text-[10px] font-bold shadow-lg pointer-events-none">
          DEV: Limits bypassed
        </div>
      )}
    </PlanContext.Provider>
  );
}

export function usePlanContext(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlanContext must be used within a PlanProvider");
  }
  return ctx;
}
