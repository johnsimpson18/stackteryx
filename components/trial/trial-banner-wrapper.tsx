"use client";

import { usePathname } from "next/navigation";
import { usePlanContext } from "@/components/providers/plan-provider";
import { TrialBanner } from "./trial-banner";

export function TrialBannerWrapper() {
  const pathname = usePathname();
  const { isTrial, trialDaysRemaining, trialUrgency, trialEndsAt, plan } =
    usePlanContext();

  // Don't show on settings page (user is already managing billing)
  if (pathname?.startsWith("/settings")) return null;

  // Show during active trial with urgency, or right after expiry
  const showExpired = plan === "free" && trialEndsAt && !isTrial;
  if (trialUrgency === "none" && !showExpired) return null;

  const urgency =
    trialUrgency === "none" && showExpired ? "expired" : trialUrgency;
  if (urgency === "none") return null;

  return (
    <TrialBanner
      daysRemaining={trialDaysRemaining}
      urgency={urgency}
      trialEndsAt={trialEndsAt}
    />
  );
}
