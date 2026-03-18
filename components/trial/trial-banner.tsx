"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing";
import { Loader2 } from "lucide-react";

type Urgency = "low" | "medium" | "high" | "expired";

interface TrialBannerProps {
  daysRemaining: number;
  urgency: Urgency;
  trialEndsAt: string | null;
}

const BORDER_COLORS: Record<Urgency, string> = {
  low: "#1e1e1e",
  medium: "#EF9F27",
  high: "#e24b4a",
  expired: "#e24b4a",
};

export function TrialBanner({
  daysRemaining,
  urgency,
  trialEndsAt,
}: TrialBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUpgrade(plan: "pro" | "enterprise") {
    startTransition(async () => {
      try {
        const { url } = await createCheckoutSession(plan);
        router.push(url);
      } catch {
        router.push("/settings");
      }
    });
  }

  const endDateStr = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      className="rounded-lg px-4 py-3 mb-4"
      style={{
        background: "#111111",
        borderLeft: `3px solid ${BORDER_COLORS[urgency]}`,
        border: `1px solid ${urgency === "low" ? "#1e1e1e" : BORDER_COLORS[urgency] + "40"}`,
        borderLeftWidth: 3,
        borderLeftColor: BORDER_COLORS[urgency],
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {urgency === "low" && (
            <>
              <p
                className="text-sm text-foreground"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                &#10022; You&apos;re on a free trial &middot;{" "}
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
              </p>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                Add a card to keep your full access after the trial ends.
              </p>
            </>
          )}
          {urgency === "medium" && (
            <>
              <p
                className="text-sm text-foreground font-medium"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                &#9889; {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left
                on your free trial
              </p>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                Your services, clients, and data are safe. Add a card to keep
                building after your trial ends{endDateStr ? ` on ${endDateStr}` : ""}.
              </p>
            </>
          )}
          {urgency === "high" && (
            <>
              <p
                className="text-sm text-foreground font-semibold"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                &#128308; Your trial ends today
              </p>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                Add a payment method now to avoid losing access to your
                services, proposals, and AI agents.
              </p>
            </>
          )}
          {urgency === "expired" && (
            <>
              <p
                className="text-sm text-foreground font-semibold"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                Your free trial has ended. You&apos;re now on the Free plan.
              </p>
              <p
                className="text-xs text-muted-foreground mt-0.5"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                Your data is safe but access is limited.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {urgency === "low" && (
                <Button size="sm" variant="outline" onClick={() => handleUpgrade("pro")}>
                  Add payment method
                </Button>
              )}
              {urgency === "medium" && (
                <>
                  <Button size="sm" onClick={() => handleUpgrade("pro")}>
                    Upgrade to Pro &mdash; $149/mo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpgrade("enterprise")}
                  >
                    See plans
                  </Button>
                </>
              )}
              {(urgency === "high" || urgency === "expired") && (
                <>
                  <Button size="sm" onClick={() => handleUpgrade("pro")}>
                    Upgrade to Pro &mdash; $149/mo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpgrade("enterprise")}
                  >
                    Upgrade to Enterprise
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
