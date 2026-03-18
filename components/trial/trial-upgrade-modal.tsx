"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/actions/billing";
import { Check, Loader2, X } from "lucide-react";

interface TrialUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  daysRemaining: number;
}

const PRO_FEATURES = [
  "10 services",
  "15 clients",
  "40 AI generations/month",
  "Full proposal engine",
  "3 team members",
];

const ENTERPRISE_FEATURES = [
  "Unlimited services",
  "Unlimited clients",
  "150 AI generations/month",
  "Unlimited team members",
];

const ENTERPRISE_EXCLUSIVE = [
  "QBR Generator",
  "Client Scorecards",
  "Portfolio Intelligence",
  "White-label exports",
  "Team workflows",
];

export function TrialUpgradeModal({
  isOpen,
  onClose,
  daysRemaining,
}: TrialUpgradeModalProps) {
  const router = useRouter();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  function handleUpgrade(plan: "pro" | "enterprise") {
    setPendingPlan(plan);
    createCheckoutSession(plan)
      .then(({ url }) => router.push(url))
      .catch(() => router.push("/settings"))
      .finally(() => setPendingPlan(null));
  }

  if (!isOpen) return null;

  const headerText =
    daysRemaining > 0
      ? `Your 7-day trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`
      : "Your 7-day trial has ended";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={daysRemaining > 0 ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl mx-4 rounded-xl overflow-hidden"
        style={{ background: "#111111", border: "1px solid #1e1e1e" }}
      >
        {/* Close button — only if trial still active */}
        {daysRemaining > 0 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h2
            className="text-lg font-bold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {headerText}
          </h2>
          <p
            className="text-sm text-muted-foreground mt-1"
            style={{ fontFamily: "var(--font-mono-alt)" }}
          >
            Everything you&apos;ve built stays safe. Choose a plan to keep your
            full access to Stackteryx.
          </p>
        </div>

        {/* Plan cards */}
        <div className="px-6 pb-4 flex gap-4">
          {/* Pro — 40% width */}
          <div
            className="w-[40%] rounded-lg p-5 flex flex-col"
            style={{ background: "#0A0A0A", border: "1px solid #1e1e1e" }}
          >
            <div className="mb-4">
              <p className="text-sm font-bold text-foreground">Pro</p>
              <p
                className="text-2xl font-extrabold text-foreground mt-1"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                $149
                <span className="text-xs font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p
                className="text-xs text-muted-foreground mt-1"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                For solo MSPs
              </p>
            </div>
            <ul className="space-y-2 flex-1 mb-4">
              {PRO_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    color: "#999999",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant="outline"
              disabled={pendingPlan !== null}
              onClick={() => handleUpgrade("pro")}
            >
              {pendingPlan === "pro" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start Pro"
              )}
            </Button>
          </div>

          {/* Enterprise — 60% width */}
          <div
            className="w-[60%] rounded-lg p-5 flex flex-col relative"
            style={{ background: "#0A0A0A", border: "2px solid #c8f135" }}
          >
            <span
              className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
            >
              Best Value
            </span>
            <div className="mb-4">
              <p className="text-sm font-bold text-foreground">Enterprise</p>
              <p
                className="text-2xl font-extrabold text-foreground mt-1"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                $399
                <span className="text-xs font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p
                className="text-xs text-muted-foreground mt-1"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                For growing practices
              </p>
            </div>
            <ul className="space-y-2 mb-3">
              {ENTERPRISE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    color: "#999999",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  <Check className="h-3 w-3 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div
              className="pt-3 mb-4 space-y-2"
              style={{ borderTop: "1px solid #1e1e1e" }}
            >
              {ENTERPRISE_EXCLUSIVE.map((f) => (
                <div
                  key={f}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    color: "#c8f135",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  <span className="text-[10px]">+</span>
                  {f}
                </div>
              ))}
            </div>
            <Button
              className="w-full mt-auto"
              disabled={pendingPlan !== null}
              onClick={() => handleUpgrade("enterprise")}
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
              }}
            >
              {pendingPlan === "enterprise" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Start Enterprise"
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <p
            className="text-xs text-muted-foreground/60"
            style={{ fontFamily: "var(--font-mono-alt)" }}
          >
            No contracts. Cancel anytime. Your data is never deleted.
          </p>
          {daysRemaining > 0 && (
            <button
              onClick={onClose}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              style={{ fontFamily: "var(--font-mono-alt)" }}
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

