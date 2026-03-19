"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing";
import { usePlanContext } from "@/components/providers/plan-provider";
import { Loader2 } from "lucide-react";
import type { LimitType } from "./limit-context";

const LIMIT_COPY: Record<
  LimitType,
  { title: string; unit: string; upgradeText: string }
> = {
  services: {
    title: "You\u2019ve reached your service limit",
    unit: "services",
    upgradeText: "Design unlimited services on Enterprise, or up to 10 on Pro.",
  },
  clients: {
    title: "You\u2019ve reached your client limit",
    unit: "clients",
    upgradeText: "Add unlimited clients on Enterprise, or up to 15 on Pro.",
  },
  aiGenerationsPerMonth: {
    title: "You\u2019ve used all your AI generations this month",
    unit: "AI generations",
    upgradeText:
      "Get 40 AI generations/month on Pro, or 150 on Enterprise. Resets on the 1st.",
  },
  exportsPerMonth: {
    title: "You\u2019ve reached your export limit",
    unit: "exports",
    upgradeText:
      "Get 20 exports/month on Pro, or 75 on Enterprise. Resets on the 1st.",
  },
  ctoBriefsTotalEver: {
    title: "You\u2019ve reached your brief limit",
    unit: "briefs",
    upgradeText: "Generate up to 10 briefs/month on Pro, or unlimited on Enterprise.",
  },
  teamMembers: {
    title: "Your plan doesn\u2019t support more team members",
    unit: "team members",
    upgradeText:
      "The Pro plan supports up to 3 team members. Upgrade to Enterprise for unlimited seats.",
  },
};

interface LimitHitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: LimitType;
  current: number;
  limit: number;
}

export function LimitHitModal({
  isOpen,
  onClose,
  limitType,
  current,
  limit,
}: LimitHitModalProps) {
  const router = useRouter();
  const { plan } = usePlanContext();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const copy = LIMIT_COPY[limitType];
  const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 100;
  const barColor = pct >= 100 ? "#e24b4a" : pct >= 80 ? "#EF9F27" : "#c8f135";

  function handleUpgrade(target: "pro" | "enterprise") {
    setPendingPlan(target);
    createCheckoutSession(target)
      .then(({ url }) => router.push(url))
      .catch(() => router.push("/settings"))
      .finally(() => setPendingPlan(null));
  }

  const p = plan as string;
  const showPro = p !== "pro" && p !== "enterprise";
  const showEnterprise = p !== "enterprise";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — cannot dismiss by clicking */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md mx-4 rounded-xl"
        style={{ background: "#111111", border: "1px solid #1e1e1e" }}
      >
        <div className="p-6 space-y-5">
          {/* Title */}
          <h2
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {copy.title}
          </h2>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}>
                {current} / {limit} {copy.unit} used
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>

          {/* Upgrade text */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
          >
            You&apos;re on the {plan === "trial" ? "Free Trial" : plan === "free" ? "Free" : "Pro"} plan.{" "}
            {copy.upgradeText}
          </p>

          {/* Plan cards */}
          <div className="flex gap-3">
            {showPro && (
              <div
                className="flex-1 rounded-lg p-3"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #333333",
                  opacity: p === "pro" ? 0.5 : 1,
                }}
              >
                <p className="text-xs font-bold text-foreground">Pro</p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                  $149/mo
                </p>
              </div>
            )}
            {showEnterprise && (
              <div
                className="flex-1 rounded-lg p-3"
                style={{ background: "#0A0A0A", border: "2px solid #c8f135" }}
              >
                <p className="text-xs font-bold text-foreground">
                  Enterprise <span style={{ color: "#c8f135" }}>&#9733;</span>
                </p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
                  $399/mo &middot; Unlimited
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-2">
            {showEnterprise && (
              <Button
                className="w-full"
                disabled={pendingPlan !== null}
                onClick={() => handleUpgrade("enterprise")}
                style={{ background: "#c8f135", color: "#0A0A0A" }}
              >
                {pendingPlan === "enterprise" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Upgrade to Enterprise"
                )}
              </Button>
            )}
            {showPro && (
              <Button
                className="w-full"
                variant="outline"
                disabled={pendingPlan !== null}
                onClick={() => handleUpgrade("pro")}
              >
                {pendingPlan === "pro" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Upgrade to Pro \u2014 $149/mo"
                )}
              </Button>
            )}
          </div>

          {/* Maybe later */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              style={{ fontFamily: "var(--font-mono-alt)" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
