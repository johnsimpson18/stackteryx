"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { BUNDLE_STATUS_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  ChevronRight,
  Circle,
  DollarSign,
  FileText,
  Layers,
  Package,
  Plus,
  Rocket,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { IntelligenceCard } from "@/components/dashboard/intelligence-card";
import { AttentionFeed } from "@/components/dashboard/attention-feed";
import { MRRBreakdown } from "@/components/dashboard/mrr-breakdown";
import { RenewalList } from "@/components/dashboard/renewal-list";
import type { AttentionItem } from "@/components/dashboard/attention-feed";
import type { MRRServiceItem } from "@/components/dashboard/mrr-breakdown";
import type { RenewalItem } from "@/components/dashboard/renewal-list";
import type { BundleWithMeta, ServiceCompleteness } from "@/lib/types";
import type { PricingHealthSummary } from "@/lib/db/dashboard";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistSteps {
  hasVendors: boolean;
  hasServices: boolean;
  hasProposals: boolean;
  hasClients: boolean;
}

interface DashboardClientProps {
  checklist: ChecklistSteps | null;
  bundles: BundleWithMeta[];
  completeness: ServiceCompleteness[];
  defaultTargetMargin: number;
  portfolioMrr: number;
  avgMargin: number | null;
  activeClients: number;
  pricingHealth: PricingHealthSummary | null;
  mrrByService: MRRServiceItem[];
  renewals: RenewalItem[];
  proposalStats: { total: number; drafts: number; sent: number };
  ctoBriefCount: number;
  attentionItems: AttentionItem[];
  orgCreatedAt: string | null;
  firstName: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient({
  checklist,
  bundles,
  completeness,
  defaultTargetMargin,
  portfolioMrr,
  avgMargin,
  activeClients,
  pricingHealth,
  mrrByService,
  renewals,
  proposalStats,
  ctoBriefCount,
  attentionItems,
  orgCreatedAt,
  firstName,
}: DashboardClientProps) {
  const [filterNeedingAttention, setFilterNeedingAttention] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const hasServices = bundles.length > 0;

  // Show welcome banner for 7 days after org creation
  const showWelcome = (() => {
    if (welcomeDismissed || !orgCreatedAt) return false;
    const created = new Date(orgCreatedAt);
    const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreation <= 7;
  })();

  // ── Portfolio Health Grid data ───────────────────────────────────────────
  const completenessMap = new Map(
    completeness.map((c) => [c.bundle_id, c]),
  );
  const gridBundles = bundles
    .filter((b) => b.status !== "archived")
    .map((b) => ({
      bundle: b,
      completeness: completenessMap.get(b.id) ?? null,
    }))
    .sort(
      (a, b) =>
        (a.completeness?.layers_complete ?? 0) -
        (b.completeness?.layers_complete ?? 0),
    );
  const filteredGridBundles = filterNeedingAttention
    ? gridBundles.filter((g) => (g.completeness?.layers_complete ?? 0) < 3)
    : gridBundles;

  // ── Margin sub-value styling ─────────────────────────────────────────────
  const marginSubType: "positive" | "negative" | "warning" | "neutral" =
    avgMargin === null
      ? "neutral"
      : avgMargin >= defaultTargetMargin
        ? "positive"
        : avgMargin >= defaultTargetMargin - 0.05
          ? "warning"
          : "negative";

  return (
    <div className="space-y-7">
      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {getGreeting()}.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your portfolio intelligence briefing
          </p>
        </div>
        {hasServices && (
          <Button asChild>
            <Link href="/services/new">
              <Plus className="h-4 w-4 mr-1.5" />
              Build a Service
            </Link>
          </Button>
        )}
      </div>

      {/* ── Welcome Banner (post-onboarding, first 7 days) ────────────── */}
      {showWelcome && (
        <div
          className="rounded-lg p-5 relative"
          style={{
            backgroundColor: "#111111",
            border: "1px solid #1e1e1e",
            borderLeft: "3px solid #A8FF3E",
          }}
        >
          <button
            type="button"
            onClick={() => setWelcomeDismissed(true)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4" />
          </button>
          <p
            className="font-bold uppercase tracking-tight"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              color: "#FFFFFF",
            }}
          >
            {firstName ? `Welcome, ${firstName}.` : "Welcome to Stackteryx."}
          </p>
          <p
            className="mt-1"
            style={{
              fontFamily: "var(--font-mono-alt)",
              fontSize: 13,
              color: "#999999",
              lineHeight: 1.6,
            }}
          >
            {hasServices
              ? "Your services are ready. Add your first client to start generating proposals."
              : "You're starting fresh. Add your tools first, then build your first service."}
          </p>
          <div className="mt-3">
            {hasServices ? (
              <Link
                href="/clients"
                className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-tight transition-colors"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#A8FF3E",
                }}
              >
                Add your first client
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/stack-catalog"
                className="inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-tight transition-colors"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "#A8FF3E",
                }}
              >
                Add your tools
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── 2. Getting Started Checklist ────────────────────────────────── */}
      {checklist && <GettingStartedChecklist steps={checklist} />}

      {/* ── 3. Metric Cards ────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolio MRR"
          value={formatCurrency(portfolioMrr)}
          subValue={`${formatCurrency(portfolioMrr * 12)} ARR`}
          subValueType="neutral"
          href="/services"
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Margin"
          value={avgMargin !== null ? formatPercent(avgMargin) : "—"}
          subValue={
            avgMargin !== null
              ? `Target: ${formatPercent(defaultTargetMargin)}`
              : "No active configs"
          }
          subValueType={marginSubType}
          href="/services"
          icon={TrendingUp}
        />
        <MetricCard
          label="Active Clients"
          value={String(activeClients)}
          subValue="with active contracts"
          subValueType="neutral"
          href="/clients"
          icon={Users}
        />
        <MetricCard
          label="Proposals"
          value={String(proposalStats.total)}
          subValue={proposalStats.sent > 0 ? `${proposalStats.sent} sent` : "none sent yet"}
          subValueType={proposalStats.sent > 0 ? "positive" : "neutral"}
          href="/sales-studio"
          icon={FileText}
        />
      </div>

      {/* ── 4. Intelligence Cards (2×2) ────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <IntelligenceCard
          label="Pricing Health"
          icon={AlertTriangle}
          iconColor="#ef9f27"
          cta={{ label: "View all →", href: "/services" }}
          emptyState="Add active services with pricing to see health data."
        >
          {pricingHealth && <PricingHealthContent data={pricingHealth} />}
        </IntelligenceCard>

        <IntelligenceCard
          label="Upcoming Renewals"
          icon={Calendar}
          iconColor="#378add"
          cta={{ label: "All clients →", href: "/clients" }}
          emptyState="No renewals due in the next 90 days."
        >
          {renewals.length > 0 ? <RenewalList renewals={renewals} /> : null}
        </IntelligenceCard>

        <IntelligenceCard
          label="Proposal Pipeline"
          icon={FileText}
          iconColor="#378add"
          cta={{ label: "Sales Studio →", href: "/sales-studio" }}
          emptyState="No proposals generated yet."
        >
          {proposalStats.total > 0 ? (
            <ProposalStatsContent stats={proposalStats} />
          ) : null}
        </IntelligenceCard>

        <IntelligenceCard
          label="CTO Briefs"
          icon={Brain}
          iconColor="#c8f135"
          cta={{ label: "Generate →", href: "/fractional-cto" }}
          emptyState="No CTO briefs generated yet."
        >
          {ctoBriefCount > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#ffffff",
                  fontFamily: "var(--font-mono-alt)",
                  lineHeight: 1,
                }}
              >
                {ctoBriefCount}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                  marginTop: 6,
                }}
              >
                briefs generated
              </div>
            </div>
          ) : null}
        </IntelligenceCard>
      </div>

      {/* ── 5. Attention Feed ──────────────────────────────────────────── */}
      <div
        style={{
          background: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16, color: "#ef9f27" }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#ffffff",
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Needs Attention
          </span>
        </div>
        <AttentionFeed items={attentionItems} />
      </div>

      {/* ── 6. Revenue by Service ──────────────────────────────────────── */}
      <div
        style={{
          background: "#111111",
          border: "1px solid #1e1e1e",
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign style={{ width: 16, height: 16, color: "#666666" }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#ffffff",
                fontFamily: "var(--font-display)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Revenue by Service
            </span>
          </div>
          <Link
            href="/services"
            style={{
              fontSize: 12,
              color: "#c8f135",
              fontFamily: "var(--font-mono-alt)",
              textDecoration: "none",
            }}
          >
            View all →
          </Link>
        </div>
        <MRRBreakdown services={mrrByService} totalMrr={portfolioMrr} />
      </div>

      {/* ── Zero-state hero ────────────────────────────────────────────── */}
      {!hasServices && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">
            Start by building your first service.
          </p>
          <p className="text-sm text-muted-foreground mb-5 max-w-md">
            Package your tools, define pricing, and generate sales enablement
            content — all in one guided wizard.
          </p>
          <Button size="lg" asChild>
            <Link href="/services/new">
              Build a Service
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* ── 7. Portfolio Health Grid ──────────────────────────────────── */}
      <PortfolioHealthGrid
        items={filteredGridBundles}
        isFiltered={filterNeedingAttention}
        onClearFilter={() => setFilterNeedingAttention(false)}
        onToggleFilter={() => setFilterNeedingAttention((prev) => !prev)}
        hasServices={hasServices}
      />
    </div>
  );
}

// ── Pricing Health Content ───────────────────────────────────────────────────

function PricingHealthContent({ data }: { data: PricingHealthSummary }) {
  const { marginBuckets, topRisks } = data;
  const total =
    marginBuckets.healthy +
    marginBuckets.watch +
    marginBuckets.atRisk +
    marginBuckets.critical;

  if (total === 0) return null;

  const buckets = [
    { label: "Healthy", count: marginBuckets.healthy, color: "#c8f135" },
    { label: "Watch", count: marginBuckets.watch, color: "#ef9f27" },
    { label: "At Risk", count: marginBuckets.atRisk, color: "#e24b4a" },
    { label: "Critical", count: marginBuckets.critical, color: "#ff4444" },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: topRisks.length > 0 ? 16 : 0 }}>
        {buckets.map((b) => (
          <div
            key={b.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: b.color,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "#888888",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              {b.label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              {b.count}
            </span>
          </div>
        ))}
      </div>

      {topRisks.length > 0 && (
        <div style={{ borderTop: "1px solid #1e1e1e", paddingTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 8,
            }}
          >
            Lowest Margins
          </div>
          {topRisks.map((risk) => (
            <div
              key={risk.bundleId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <Link
                href={`/services/${risk.bundleId}`}
                style={{
                  fontSize: 13,
                  color: "#ffffff",
                  fontFamily: "var(--font-mono-alt)",
                  textDecoration: "none",
                }}
              >
                {risk.bundleName}
              </Link>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    risk.currentMargin < 0.1
                      ? "#e24b4a"
                      : risk.currentMargin < 0.25
                        ? "#ef9f27"
                        : "#c8f135",
                  fontFamily: "var(--font-mono-alt)",
                }}
              >
                {(risk.currentMargin * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Proposal Stats Content ───────────────────────────────────────────────────

function ProposalStatsContent({
  stats,
}: {
  stats: { total: number; drafts: number; sent: number };
}) {
  const items = [
    { label: "Total", value: stats.total, color: "#ffffff" },
    { label: "Drafts", value: stats.drafts, color: "#ef9f27" },
    { label: "Sent", value: stats.sent, color: "#c8f135" },
  ];

  return (
    <div style={{ display: "flex", gap: 32 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: item.color,
              fontFamily: "var(--font-mono-alt)",
              lineHeight: 1,
            }}
          >
            {item.value}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#666666",
              fontFamily: "var(--font-mono-alt)",
              marginTop: 6,
            }}
          >
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Getting Started Checklist ────────────────────────────────────────────────

function GettingStartedChecklist({ steps }: { steps: ChecklistSteps }) {
  const items = [
    { label: "Add your first vendor", complete: steps.hasVendors, href: "/vendors" },
    { label: "Build your first service", complete: steps.hasServices, href: "/services/new" },
    { label: "Generate your first proposal", complete: steps.hasProposals, href: "/services" },
    { label: "Add your first client", complete: steps.hasClients, href: "/clients" },
  ];
  const completedCount = items.filter((s) => s.complete).length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-7 w-7 rounded-lg bg-[#A8FF3E]/10 flex items-center justify-center shrink-0">
            <Rocket className="h-4 w-4 text-[#A8FF3E]" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            Get started with Stackteryx
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4 ml-[38px]">
          Complete these steps to unlock full value
        </p>

        <div className="space-y-1 mb-4">
          {items.map((step) => (
            <div
              key={step.label}
              className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg"
            >
              {step.complete ? (
                <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-emerald-400" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border border-border flex items-center justify-center shrink-0">
                  <Circle className="h-2 w-2 text-muted-foreground/40" />
                </div>
              )}
              {step.complete ? (
                <span className="text-sm text-muted-foreground line-through">
                  {step.label}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {step.label}
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="ml-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {completedCount} of {items.length} complete
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5">
            <div
              className="h-1.5 rounded-full bg-[#A8FF3E] transition-all duration-500"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Portfolio Health Grid ────────────────────────────────────────────────────

const LAYER_LABELS = ["Outcome", "Service", "Stack", "Economics", "Sales Materials"];
const LAYER_KEYS: (keyof ServiceCompleteness)[] = [
  "outcome_complete",
  "service_complete",
  "stack_complete",
  "economics_complete",
  "enablement_complete",
];

function PortfolioHealthGrid({
  items,
  isFiltered,
  onClearFilter,
  onToggleFilter,
  hasServices,
}: {
  items: {
    bundle: BundleWithMeta;
    completeness: ServiceCompleteness | null;
  }[];
  isFiltered: boolean;
  onClearFilter: () => void;
  onToggleFilter: () => void;
  hasServices: boolean;
}) {
  if (!hasServices) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Portfolio Health
        </h2>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Layers className="h-7 w-7 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No services yet.</p>
          <Button size="sm" asChild className="mt-3">
            <Link href="/services/new">
              Build your first service
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const needsAttentionCount = items.filter(
    (g) => (g.completeness?.layers_complete ?? 0) < 3,
  ).length;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Portfolio Health
        </h2>
        <div className="flex items-center gap-3">
          {needsAttentionCount > 0 && (
            <button
              type="button"
              onClick={onToggleFilter}
              className={cn(
                "text-xs transition-colors flex items-center gap-1",
                isFiltered
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isFiltered
                ? "Show all services"
                : `${needsAttentionCount} need attention`}
              {isFiltered && <X className="h-3 w-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-2 pb-2 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Service
        </span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-20 text-center">
          Status
        </span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-[200px] text-center">
          Layers
        </span>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider w-12 text-right">
          Score
        </span>
        <span className="w-5" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {items.length === 0 && isFiltered ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No services need attention.
            </p>
          </div>
        ) : (
          items.map(({ bundle, completeness: comp }) => {
            const layers = comp
              ? LAYER_KEYS.map((k) => comp[k] as boolean)
              : [false, false, false, false, false];
            const layersComplete = comp?.layers_complete ?? 0;

            return (
              <div
                key={bundle.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-2 py-2.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="min-w-0">
                  <Link
                    href={`/services/${bundle.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {bundle.name}
                  </Link>
                </div>

                <div className="w-20 flex justify-center">
                  <StatusBadge
                    status={bundle.status as "draft" | "active" | "archived"}
                    label={BUNDLE_STATUS_LABELS[bundle.status]}
                  />
                </div>

                <div className="w-[200px] flex items-center gap-1">
                  {layers.map((complete, i) => (
                    <div key={i} className="relative group flex-1">
                      <div
                        className={cn(
                          "h-5 rounded-sm transition-colors",
                          complete ? "bg-emerald-500/60" : "bg-red-500/30",
                        )}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border border-border text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {LAYER_LABELS[i]}:{" "}
                        {complete ? "Complete" : "Incomplete"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="w-12 text-right">
                  <span
                    className={cn(
                      "text-xs font-mono font-medium",
                      layersComplete >= 5
                        ? "text-emerald-400"
                        : layersComplete >= 3
                          ? "text-amber-400"
                          : "text-red-400",
                    )}
                  >
                    {layersComplete} / 5
                  </span>
                </div>

                <Link
                  href={`/services/${bundle.id}`}
                  className="w-5 flex justify-center"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
