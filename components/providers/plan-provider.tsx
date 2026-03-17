"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  type LimitKey,
  type Plan,
  type PlanLimitValues,
} from "@/lib/plans";

interface PlanContextValue {
  plan: Plan;
  status: string;
  usage: UsageRecord;
  limits: PlanLimitValues;
  isAtLimit: (key: LimitKey) => boolean;
  refresh: () => void;
  loading: boolean;
  comped: boolean;
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

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(CLIENT_BYPASS ? "pro" : "free");
  const [status, setStatus] = useState("active");
  const [usage, setUsage] = useState<UsageRecord>(DEFAULT_USAGE);
  const [loading, setLoading] = useState(!CLIENT_BYPASS);
  const [comped, setComped] = useState(false);

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

  const isAtLimit = useCallback(
    (key: LimitKey): boolean => {
      if (CLIENT_BYPASS) return false;
      const planLimits = PLAN_LIMITS[plan] as PlanLimitValues;
      const val = planLimits[key];
      // Boolean feature flags
      if (typeof val === "boolean") return !val;
      // Infinite limits
      if (val === Infinity) return false;
      // Usage-based limits tracked client-side
      switch (key) {
        case "aiGenerationsPerMonth":
          return usage.aiGenerationsCount >= val;
        case "exportsPerMonth":
          return usage.exportsCount >= val;
        default:
          // Count-based limits (services, clients, teamMembers, ctoBriefsTotalEver)
          // are checked server-side via checkLimit() — UI can't know the real count
          // without an extra fetch, so we optimistically allow.
          return false;
      }
    },
    [plan, usage],
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
