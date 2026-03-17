"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsageBar } from "@/components/billing/usage-bar";
import { useUpgradeModal } from "@/components/billing/upgrade-modal";
import { usePlanContext } from "@/components/providers/plan-provider";
import { createBillingPortalSession } from "@/actions/billing";
import { PLAN_DISPLAY } from "@/lib/plans";
import { AlertTriangle, CreditCard, Gift, Zap } from "lucide-react";

export function BillingSection() {
  const { plan, status, usage, limits, loading, comped } = usePlanContext();
  const { openUpgradeModal } = useUpgradeModal();
  const [isPending, startTransition] = useTransition();

  if (loading) return null;

  function handlePortal() {
    startTransition(async () => {
      try {
        const { url } = await createBillingPortalSession();
        window.location.href = url;
      } catch {
        // No billing account
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing & Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Past due warning */}
        {status === "past_due" && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Payment failed
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Please update your payment method to continue Pro access.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePortal}
              disabled={isPending}
            >
              Update Payment Method
            </Button>
          </div>
        )}

        {plan === "pro" || plan === "enterprise" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {PLAN_DISPLAY[plan].label} Plan
              </span>
              {comped && <Gift className="h-4 w-4 text-amber-400" />}
              <span className="text-sm text-muted-foreground">
                {!comped && <>{PLAN_DISPLAY[plan].price} / {PLAN_DISPLAY[plan].period}</>}
                {comped && "Complimentary"}
              </span>
            </div>

            {!comped && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePortal}
                  disabled={isPending}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" />
                  Manage Billing
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePortal}
                  disabled={isPending}
                >
                  Cancel Plan
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                Free Plan
              </span>
              <span className="text-xs text-muted-foreground">
                {limits.services} services · {limits.clients} clients ·{" "}
                {limits.aiGenerationsPerMonth} AI/month ·{" "}
                {limits.exportsPerMonth} exports/month
              </span>
            </div>

            <div className="space-y-3 max-w-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  This month&apos;s usage
                </p>
                <div className="space-y-2">
                  <UsageBar limitKey="aiGenerationsPerMonth" showLabel />
                  <UsageBar limitKey="exportsPerMonth" showLabel />
                </div>
              </div>
            </div>

            <Button size="sm" onClick={() => openUpgradeModal()}>
              <Zap className="h-3.5 w-3.5 mr-1" />
              Upgrade to Pro — {PLAN_DISPLAY.pro.price}/{PLAN_DISPLAY.pro.period}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
