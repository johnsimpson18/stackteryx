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
import { toast } from "sonner";

export function BillingSection() {
  const { plan, status, usage, limits, loading, comped, isTrial, trialDaysRemaining, trialEndsAt } = usePlanContext();
  const { openUpgradeModal } = useUpgradeModal();
  const [isPending, startTransition] = useTransition();

  if (loading) return null;

  function handlePortal() {
    startTransition(async () => {
      try {
        const result = await createBillingPortalSession();
        if ("error" in result) {
          toast.error("Upgrade to Pro to manage billing");
          openUpgradeModal();
          return;
        }
        window.location.href = result.url;
      } catch {
        toast.error("Unable to open billing portal");
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

        {isTrial ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Free Trial
              </span>
              <span className="text-sm text-muted-foreground">
                {trialDaysRemaining > 0
                  ? `Active \u00B7 ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining`
                  : "Expired"}
              </span>
            </div>
            {trialEndsAt && (
              <p suppressHydrationWarning className="text-xs text-muted-foreground">
                Ends: {new Date(trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your trial includes full Pro access &mdash; all services, clients,
              AI generations, and proposals with no limits.
            </p>
            <div className="rounded-lg bg-muted/20 border border-border p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">After your trial:</p>
              <p className="text-xs text-muted-foreground">&bull; Without a plan &rarr; Limited to 1 service, 2 clients, 2 AI/month</p>
              <p className="text-xs text-muted-foreground">&bull; With Pro ($149/mo) &rarr; 10 services, 15 clients, 40 AI/month</p>
              <p className="text-xs text-muted-foreground">&bull; With Enterprise ($399/mo) &rarr; Unlimited + advanced features</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => openUpgradeModal()}>
                <Zap className="h-3.5 w-3.5 mr-1" />
                Upgrade to Pro &mdash; $149/month
              </Button>
              <Button size="sm" variant="outline" onClick={() => openUpgradeModal()}>
                Upgrade to Enterprise &mdash; $399/month
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60">
              No card is charged until you choose a plan. Your data is never deleted regardless of plan.
            </p>
          </div>
        ) : plan === "pro" || plan === "enterprise" ? (
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
