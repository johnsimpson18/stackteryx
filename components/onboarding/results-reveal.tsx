"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { archiveBundlesAction } from "@/actions/bundles";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ResultsBundle {
  bundleId: string;
  versionId: string;
  name: string;
  tagline: string;
  description: string;
  idealFor: string;
  toolNames: string[];
  complianceAlignment: Record<string, number>;
  talkingPoints: string[];
  mrr: number;
  margin: number;
}

interface ResultsRevealProps {
  topInsight: string;
  bundles: ResultsBundle[];
  complianceTargets: string[];
  toolCount: number;
  outcomeTypes?: string[];
  companyName?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function marginColor(m: number): string {
  if (m >= 0.3) return "#A8FF3E";
  if (m >= 0.15) return "#F59E0B";
  return "#EF4444";
}

// ── Suggestion Card ──────────────────────────────────────────────────────────

function SuggestionCard({
  bundle,
  status,
  onAccept,
  onSkip,
}: {
  bundle: ResultsBundle;
  status: "neutral" | "accepted" | "skipped";
  onAccept: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      className="rounded-lg border transition-all duration-200"
      style={{
        backgroundColor: "#111111",
        borderColor:
          status === "accepted"
            ? "#A8FF3E"
            : status === "skipped"
              ? "#333333"
              : "#1E1E1E",
        padding: 24,
        opacity: status === "skipped" ? 0.5 : 1,
      }}
    >
      {/* Name + tagline */}
      <h3
        className="font-bold uppercase tracking-tight"
        style={{
          fontFamily: "var(--font-display)",
          color: "#FFFFFF",
          fontSize: 22,
        }}
      >
        {bundle.name}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-mono-alt)",
          fontSize: 13,
          color: "#999999",
          marginTop: 6,
          lineHeight: 1.6,
        }}
      >
        {bundle.description}
      </p>

      {/* Tool pills */}
      <div className="flex flex-wrap gap-2 mt-4">
        {bundle.toolNames.map((tool) => (
          <span
            key={tool}
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: "#1E1E1E",
              color: "#CCCCCC",
              fontSize: 12,
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            {tool}
          </span>
        ))}
      </div>

      {/* Price + margin */}
      <div
        className="flex items-center gap-6 mt-5 pt-4"
        style={{ borderTop: "1px solid #1E1E1E" }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Suggested MRR
          </p>
          <p
            style={{
              fontSize: 20,
              color: "#FFFFFF",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {fmt(bundle.mrr)}
          </p>
        </div>
        <div>
          <p
            style={{
              fontSize: 11,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Margin
          </p>
          <p
            style={{
              fontSize: 20,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              color: marginColor(bundle.margin),
              marginTop: 2,
            }}
          >
            {pct(bundle.margin)}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onAccept}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-tight transition-all"
          style={{
            fontFamily: "var(--font-display)",
            backgroundColor: status === "accepted" ? "#A8FF3E" : "transparent",
            color: status === "accepted" ? "#0A0A0A" : "#A8FF3E",
            border: "1px solid #A8FF3E",
          }}
        >
          <Check style={{ width: 16, height: 16 }} />
          {status === "accepted" ? "Added" : "Add to my services"}
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold uppercase tracking-tight transition-all"
          style={{
            fontFamily: "var(--font-display)",
            backgroundColor: "transparent",
            color: status === "skipped" ? "#666666" : "#999999",
            border: `1px solid ${status === "skipped" ? "#333333" : "#333333"}`,
          }}
        >
          <X style={{ width: 16, height: 16 }} />
          {status === "skipped" ? "Skipped" : "Skip this one"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ResultsReveal({
  topInsight,
  bundles,
  companyName,
}: ResultsRevealProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, "neutral" | "accepted" | "skipped">>(
    () => Object.fromEntries(bundles.map((b) => [b.bundleId, "neutral" as const]))
  );

  const acceptedCount = Object.values(statuses).filter((s) => s === "accepted").length;
  const allBundleIds = bundles.map((b) => b.bundleId);

  function toggleAccept(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "accepted" ? "neutral" : "accepted",
    }));
  }

  function toggleSkip(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: prev[id] === "skipped" ? "neutral" : "skipped",
    }));
  }

  function acceptAll() {
    setStatuses(Object.fromEntries(bundles.map((b) => [b.bundleId, "accepted" as const])));
  }

  function handleAddSelected() {
    startTransition(async () => {
      // Archive all non-accepted bundles
      const toArchive = allBundleIds.filter((id) => statuses[id] !== "accepted");
      if (toArchive.length > 0) {
        await archiveBundlesAction(toArchive);
      }
      toast.success(
        `Your ${acceptedCount} service${acceptedCount !== 1 ? "s are" : " is"} ready. Next, add a client and generate your first proposal.`
      );
      router.push("/dashboard");
    });
  }

  function handleStartFromScratch() {
    startTransition(async () => {
      // Archive all auto-generated bundles
      if (allBundleIds.length > 0) {
        await archiveBundlesAction(allBundleIds);
      }
      router.push("/dashboard");
    });
  }

  return (
    <div
      className="min-h-screen app-grid-bg"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="mx-auto px-6 py-16" style={{ maxWidth: 900 }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <p
          className="text-center uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-mono-alt)",
            fontSize: 12,
            color: "#A8FF3E",
            letterSpacing: "0.2em",
          }}
        >
          SUGGESTIONS READY
        </p>
        <h1
          className="text-center font-bold uppercase tracking-tight mt-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 44,
            color: "#FFFFFF",
          }}
        >
          {companyName
            ? `HERE'S WHAT WE SUGGEST FOR ${companyName.toUpperCase()}`
            : "HERE'S WHAT WE SUGGEST"}
        </h1>
        <p
          className="text-center mt-4 mx-auto"
          style={{
            fontFamily: "var(--font-mono-alt)",
            fontSize: 14,
            color: "#999999",
            maxWidth: 600,
            lineHeight: 1.6,
          }}
        >
          Based on your tools, clients, and delivery model, we&apos;ve prepared{" "}
          {bundles.length} service suggestion{bundles.length !== 1 ? "s" : ""}.
          Review them below — accept the ones that fit, skip the ones that don&apos;t.
          You can always build more later.
        </p>

        {/* ── AI Insight ──────────────────────────────────────────── */}
        <div
          className="mt-8 rounded-lg p-5"
          style={{
            backgroundColor: "#111111",
            borderLeft: "3px solid #A8FF3E",
          }}
        >
          <div className="flex items-start gap-3">
            <span style={{ color: "#A8FF3E", fontSize: 18, lineHeight: 1 }}>
              ⚡
            </span>
            <div>
              <p
                className="font-medium uppercase"
                style={{
                  fontFamily: "var(--font-mono-alt)",
                  fontSize: 11,
                  color: "#A8FF3E",
                  letterSpacing: "0.1em",
                }}
              >
                AI INSIGHT
              </p>
              <p
                className="mt-1"
                style={{ fontSize: 14, color: "#CCCCCC", lineHeight: 1.6 }}
              >
                {topInsight}
              </p>
            </div>
          </div>
        </div>

        {/* ── Suggestion Cards ────────────────────────────────────── */}
        <div className="mt-12 space-y-6">
          {bundles.map((bundle) => (
            <SuggestionCard
              key={bundle.bundleId}
              bundle={bundle}
              status={statuses[bundle.bundleId] ?? "neutral"}
              onAccept={() => toggleAccept(bundle.bundleId)}
              onSkip={() => toggleSkip(bundle.bundleId)}
            />
          ))}
        </div>

        {/* ── Footer Actions ──────────────────────────────────────── */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <button
            onClick={handleAddSelected}
            disabled={acceptedCount === 0 || isPending}
            className="rounded-lg font-bold uppercase tracking-tight transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              backgroundColor: "#A8FF3E",
              color: "#0A0A0A",
              padding: "14px 36px",
            }}
          >
            {isPending
              ? "ADDING..."
              : acceptedCount > 0
                ? `ADD ${acceptedCount} SERVICE${acceptedCount !== 1 ? "S" : ""} TO MY WORKSPACE →`
                : "SELECT SERVICES TO CONTINUE"}
          </button>

          <div className="flex items-center gap-6 mt-2">
            <button
              onClick={acceptAll}
              className="transition-colors"
              style={{
                fontFamily: "var(--font-mono-alt)",
                fontSize: 13,
                color: "#666666",
              }}
            >
              Add all suggestions
            </button>
            <span style={{ color: "#333333" }}>|</span>
            <button
              onClick={handleStartFromScratch}
              disabled={isPending}
              className="transition-colors"
              style={{
                fontFamily: "var(--font-mono-alt)",
                fontSize: 13,
                color: "#666666",
              }}
            >
              Start from scratch — I&apos;ll build my own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
