"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface ResultsBundle {
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

function coverageColor(c: number): string {
  if (c >= 75) return "#A8FF3E";
  if (c >= 50) return "#F59E0B";
  return "#EF4444";
}

// ── Bundle Card ──────────────────────────────────────────────────────────────

function BundleCard({ bundle, outcomeTypes }: { bundle: ResultsBundle; outcomeTypes?: string[] }) {
  const [showTalking, setShowTalking] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const router = useRouter();

  const cost = bundle.mrr * (1 - bundle.margin);
  const hasCompliance = Object.keys(bundle.complianceAlignment).length > 0;

  return (
    <div
      className="rounded-lg border"
      style={{ backgroundColor: "#111111", borderColor: "#1E1E1E", padding: 24 }}
    >
      {/* Header */}
      <h3
        className="font-bold uppercase tracking-tight"
        style={{
          fontFamily: "var(--font-display)",
          color: "#FFFFFF",
          fontSize: 24,
        }}
      >
        {bundle.name}
      </h3>
      {outcomeTypes && outcomeTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {outcomeTypes.map((ot) => (
            <span
              key={ot}
              className="rounded-full px-2.5 py-0.5"
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono-alt)",
                backgroundColor: "rgba(168, 255, 62, 0.08)",
                color: "#A8FF3E",
                border: "1px solid rgba(168, 255, 62, 0.2)",
              }}
            >
              {ot}
            </span>
          ))}
        </div>
      )}
      <p
        style={{
          fontFamily: "var(--font-mono-alt)",
          fontSize: 13,
          color: "#A8FF3E",
          marginTop: 4,
        }}
      >
        {bundle.tagline}
      </p>
      <p style={{ fontSize: 14, color: "#999999", marginTop: 12, lineHeight: 1.6 }}>
        {bundle.description}
      </p>
      <p style={{ fontSize: 13, color: "#666666", marginTop: 8 }}>
        <span style={{ color: "#A8FF3E" }}>Ideal for: </span>
        {bundle.idealFor}
      </p>

      {/* Tools row */}
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

      {/* Financials */}
      <div
        className="grid grid-cols-3 gap-4 mt-6 pt-4"
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
            Monthly Cost
          </p>
          <p
            style={{
              fontSize: 20,
              color: "#FFFFFF",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {fmt(cost)}
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
            Monthly Revenue
          </p>
          <p
            style={{
              fontSize: 20,
              color: "#FFFFFF",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              marginTop: 4,
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
              marginTop: 4,
            }}
          >
            {pct(bundle.margin)}
          </p>
        </div>
      </div>

      {/* Collapsible: Talking Points */}
      <button
        onClick={() => setShowTalking(!showTalking)}
        className="flex items-center gap-2 mt-5 w-full text-left"
        style={{
          fontSize: 13,
          color: "#666666",
          fontFamily: "var(--font-mono-alt)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transform: showTalking ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▶
        </span>
        Talking Points
      </button>
      {showTalking && (
        <ul className="mt-2 space-y-1 pl-6" style={{ fontSize: 13, color: "#999999" }}>
          {bundle.talkingPoints.map((tp, i) => (
            <li key={i} style={{ listStyleType: "disc" }}>
              {tp}
            </li>
          ))}
        </ul>
      )}

      {/* Collapsible: Compliance */}
      {hasCompliance && (
        <>
          <button
            onClick={() => setShowCompliance(!showCompliance)}
            className="flex items-center gap-2 mt-3 w-full text-left"
            style={{
              fontSize: 13,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: showCompliance ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            >
              ▶
            </span>
            Compliance Coverage
          </button>
          {showCompliance && (
            <div className="mt-2 space-y-2 pl-6">
              {Object.entries(bundle.complianceAlignment).map(
                ([framework, coverage]) => (
                  <div key={framework}>
                    <div
                      className="flex justify-between"
                      style={{
                        fontSize: 12,
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      <span style={{ color: "#999999" }}>{framework}</span>
                      <span style={{ color: coverageColor(coverage) }}>
                        {coverage}%
                      </span>
                    </div>
                    <div
                      className="h-1 rounded-full mt-1"
                      style={{ backgroundColor: "#1E1E1E" }}
                    >
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${coverage}%`,
                          backgroundColor: coverageColor(coverage),
                          transition: "width 0.5s ease-out",
                        }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}

      {/* Footer buttons */}
      <div
        className="flex gap-3 mt-6 pt-4"
        style={{ borderTop: "1px solid #1E1E1E" }}
      >
        <button
          onClick={() => router.push(`/services/${bundle.bundleId}`)}
          className="rounded px-4 py-2 transition-colors"
          style={{
            backgroundColor: "#1E1E1E",
            color: "#CCCCCC",
            fontFamily: "var(--font-mono-alt)",
            fontSize: 12,
          }}
        >
          View Service
        </button>
        <button
          onClick={() => router.push("/services")}
          className="rounded px-4 py-2 transition-colors"
          style={{
            backgroundColor: "transparent",
            color: "#666666",
            border: "1px solid #333333",
            fontFamily: "var(--font-mono-alt)",
            fontSize: 12,
          }}
        >
          Edit Service
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ResultsReveal({
  topInsight,
  bundles,
  complianceTargets,
  toolCount,
  outcomeTypes,
}: ResultsRevealProps) {
  const router = useRouter();

  const avgMargin =
    bundles.length > 0
      ? bundles.reduce((sum, b) => sum + b.margin, 0) / bundles.length
      : 0;
  const totalMrr = bundles.reduce((sum, b) => sum + b.mrr, 0);
  const totalArr = totalMrr * 12;

  return (
    <div
      className="min-h-screen app-grid-bg"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="mx-auto px-6 py-16" style={{ maxWidth: 900 }}>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <p
          className="text-center uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-mono-alt)",
            fontSize: 12,
            color: "#A8FF3E",
            letterSpacing: "0.2em",
          }}
        >
          YOUR STACKTERYX IS READY
        </p>
        <h1
          className="text-center font-bold uppercase tracking-tight mt-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 48,
            color: "#FFFFFF",
          }}
        >
          HERE&apos;S YOUR PORTFOLIO
        </h1>
        <p
          className="text-center mt-3"
          style={{
            fontFamily: "var(--font-mono-alt)",
            fontSize: 14,
            color: "#666666",
          }}
        >
          {bundles.length} service{bundles.length !== 1 ? "s" : ""} &middot;{" "}
          {toolCount} tool{toolCount !== 1 ? "s" : ""} configured
        </p>

        {/* ── AI Insight ────────────────────────────────────────── */}
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

        {/* ── Bundle Cards ──────────────────────────────────────── */}
        <div className="mt-12 space-y-6">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.bundleId} bundle={bundle} outcomeTypes={outcomeTypes} />
          ))}
        </div>

        {/* ── Compliance Overview ───────────────────────────────── */}
        {complianceTargets.length > 0 && (
          <div className="mt-12">
            <h2
              className="font-bold uppercase tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                color: "#FFFFFF",
              }}
            >
              COMPLIANCE COVERAGE
            </h2>
            <p
              className="mt-2"
              style={{
                fontSize: 13,
                color: "#666666",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Maximum coverage across your services for each targeted framework
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {complianceTargets.map((framework) => {
                const maxCoverage = Math.max(
                  0,
                  ...bundles.map(
                    (b) => b.complianceAlignment[framework] ?? 0
                  )
                );
                return (
                  <div
                    key={framework}
                    className="rounded-lg border p-4"
                    style={{
                      backgroundColor: "#111111",
                      borderColor: "#1E1E1E",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span
                        style={{
                          fontSize: 13,
                          color: "#CCCCCC",
                          fontFamily: "var(--font-mono-alt)",
                        }}
                      >
                        {framework}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: coverageColor(maxCoverage),
                          fontFamily: "var(--font-mono-alt)",
                          fontWeight: 700,
                        }}
                      >
                        {maxCoverage}%
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full mt-3"
                      style={{ backgroundColor: "#1E1E1E" }}
                    >
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${maxCoverage}%`,
                          backgroundColor: coverageColor(maxCoverage),
                          transition: "width 0.5s ease-out",
                        }}
                      />
                    </div>
                    <p
                      className="mt-2"
                      style={{
                        fontSize: 11,
                        color: "#666666",
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      {maxCoverage >= 75
                        ? "Strong coverage"
                        : maxCoverage >= 50
                          ? "Moderate coverage — review gaps"
                          : "Low coverage — additional tools recommended"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Financial Snapshot ─────────────────────────────────── */}
        <div className="mt-12">
          <h2
            className="font-bold uppercase tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              color: "#FFFFFF",
            }}
          >
            FINANCIAL SNAPSHOT
          </h2>
          <p
            className="mt-2"
            style={{
              fontSize: 13,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            Projected revenue based on 50-seat client model
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div
              className="rounded-lg border p-6 text-center"
              style={{ backgroundColor: "#111111", borderColor: "#1E1E1E" }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                AVG MARGIN
              </p>
              <p
                className="mt-2"
                style={{
                  fontSize: 36,
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: marginColor(avgMargin),
                }}
              >
                {pct(avgMargin)}
              </p>
            </div>
            <div
              className="rounded-lg border p-6 text-center"
              style={{ backgroundColor: "#111111", borderColor: "#1E1E1E" }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                EST. MRR
              </p>
              <p
                className="mt-2"
                style={{
                  fontSize: 36,
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {fmt(totalMrr)}
              </p>
            </div>
            <div
              className="rounded-lg border p-6 text-center"
              style={{ backgroundColor: "#111111", borderColor: "#1E1E1E" }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                EST. ARR
              </p>
              <p
                className="mt-2"
                style={{
                  fontSize: 36,
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "#FFFFFF",
                }}
              >
                {fmt(totalArr)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Footer CTA ────────────────────────────────────────── */}
        <div className="mt-16 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg font-bold uppercase tracking-tight transition-all hover:brightness-110"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              backgroundColor: "#A8FF3E",
              color: "#0A0A0A",
              padding: "16px 40px",
            }}
          >
            EXPLORE YOUR WORKSPACE
          </button>
          <button
            onClick={() => router.push("/services")}
            className="rounded-lg font-bold uppercase tracking-tight transition-all hover:border-[#A8FF3E]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              backgroundColor: "transparent",
              color: "#A8FF3E",
              padding: "16px 40px",
              border: "1px solid #333333",
            }}
          >
            ADJUST MY SERVICES
          </button>
        </div>
      </div>
    </div>
  );
}
