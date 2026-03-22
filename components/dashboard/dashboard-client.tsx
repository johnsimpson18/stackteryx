"use client";

import { useState, useEffect } from "react";
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
  Zap,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { IntelligenceCard } from "@/components/dashboard/intelligence-card";
import { AttentionFeed } from "@/components/dashboard/attention-feed";
import { MRRBreakdown } from "@/components/dashboard/mrr-breakdown";
import { RenewalList } from "@/components/dashboard/renewal-list";
import { AgentBadge } from "@/components/agents/agent-badge";
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed";
import { AGENTS } from "@/lib/agents";
import { NudgeFeed } from "@/components/scout/nudge-feed";
import {
  PracticeIntelligence,
  PracticeIntelligencePlaceholder,
} from "@/components/dashboard/practice-intelligence";
import { HorizonDigestCard } from "@/components/horizon/horizon-digest-card";
import { ChatPanel } from "@/components/intelligence-chat/chat-panel";
import type { ChatContext } from "@/lib/intelligence/chat-context";
import { usePlanContext } from "@/components/providers/plan-provider";
import { useUpgradeModal } from "@/components/billing/upgrade-modal";
import type { ScoutNudgeRecord } from "@/actions/scout-nudges";
import type { OrgSignals } from "@/lib/intelligence/signal-engine";
import type { HorizonDigest } from "@/types/horizon";
import type { AgentActivityRecord } from "@/lib/agents/log-activity";
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
  recentActivities: AgentActivityRecord[];
  scoutNudges?: ScoutNudgeRecord[];
  orgSignals?: OrgSignals | null;
  serviceCount?: number;
  horizonDigest?: HorizonDigest | null;
  horizonDigestId?: string | null;
  chatContext?: ChatContext | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeGreeting(): string {
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
  recentActivities,
  scoutNudges = [],
  orgSignals = null,
  serviceCount = 0,
  horizonDigest = null,
  horizonDigestId = null,
  chatContext = null,
}: DashboardClientProps) {
  const [filterNeedingAttention, setFilterNeedingAttention] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [greeting, setGreeting] = useState("Welcome back");
  const [mounted, setMounted] = useState(false);
  const [trialWelcomeDismissed, setTrialWelcomeDismissed] = useState(true);
  const [postTrialAlertDismissed, setPostTrialAlertDismissed] = useState(true);
  const { isTrial, trialDaysRemaining, trialEndsAt, plan: currentPlan } = usePlanContext();
  const { openUpgradeModal } = useUpgradeModal();
  const isPostTrial = currentPlan === "free" && trialEndsAt !== null && !isTrial;
  const hasServices = bundles.length > 0;

  useEffect(() => {
    setGreeting(computeGreeting());
    setMounted(true);
    // Show trial welcome only if not previously dismissed and trial is new (7 days remaining)
    if (isTrial && trialDaysRemaining >= 6) {
      const dismissed = localStorage.getItem("stackteryx-trial-welcome-dismissed");
      if (!dismissed) setTrialWelcomeDismissed(false);
    }
    // Show post-trial alert once per session
    if (isPostTrial) {
      const dismissed = sessionStorage.getItem("stackteryx-post-trial-dismissed");
      if (!dismissed) setPostTrialAlertDismissed(false);
    }
  }, [isTrial, trialDaysRemaining, isPostTrial]);

  // Show welcome banner for 7 days after org creation
  const showWelcome = (() => {
    if (!mounted || welcomeDismissed || !orgCreatedAt) return false;
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
      {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
      <div className="space-y-7">
      {/* ── 1. Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {greeting}.
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {chatContext?.wizardProfile?.isFirstDashboardLoad
              ? "Your practice assessment is ready in the chat \u2192"
              : "Your portfolio intelligence briefing"}
          </p>
        </div>
        <Button asChild>
          <Link href={hasServices ? "/services/new" : "/stack-builder"}>
            <Plus className="h-4 w-4 mr-1.5" />
            {hasServices ? "Build a Service" : "Build Your First Service"}
          </Link>
        </Button>
      </div>

      {/* ── Trial Welcome ────────────────────────────────────────── */}
      {isTrial && !trialWelcomeDismissed && (
        <div
          className="rounded-lg p-5 relative"
          style={{ background: "#111111", border: "1px solid #1e1e1e", borderLeft: "3px solid #c8f135" }}
        >
          <button
            type="button"
            onClick={() => {
              setTrialWelcomeDismissed(true);
              localStorage.setItem("stackteryx-trial-welcome-dismissed", "true");
            }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Welcome to Stackteryx. Your 7-day trial has started.
          </p>
          <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "var(--font-mono-alt)" }}>
            You have full access to all Pro features. Here&apos;s what to do first:
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/stack-catalog" className="text-xs font-medium text-primary hover:underline" style={{ fontFamily: "var(--font-mono-alt)" }}>
              1. Add your tools &rarr;
            </Link>
            <Link href="/stack-builder" className="text-xs font-medium text-primary hover:underline" style={{ fontFamily: "var(--font-mono-alt)" }}>
              2. Build a service &rarr;
            </Link>
            <Link href="/cto-briefs" className="text-xs font-medium text-primary hover:underline" style={{ fontFamily: "var(--font-mono-alt)" }}>
              3. Try Technology Advisory &rarr;
            </Link>
          </div>
          {trialEndsAt && (
            <p suppressHydrationWarning className="text-[10px] text-muted-foreground/50 mt-3" style={{ fontFamily: "var(--font-mono-alt)" }}>
              Your trial ends on {new Date(trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. No card needed until then.
            </p>
          )}
        </div>
      )}

      {/* ── Post-Trial Downgrade Alert ────────────────────────────── */}
      {isPostTrial && !postTrialAlertDismissed && (
        <div
          className="rounded-lg p-5 relative"
          style={{ background: "#111111", border: "1px solid #e24b4a40", borderLeft: "3px solid #e24b4a" }}
        >
          <button
            type="button"
            onClick={() => {
              setPostTrialAlertDismissed(true);
              sessionStorage.setItem("stackteryx-post-trial-dismissed", "true");
            }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Your Free Trial has ended.
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl" style={{ fontFamily: "var(--font-mono-alt)" }}>
            Your data is safe &mdash; all your services, clients, and proposals are preserved.
            You&apos;re now on the Free plan with limited access.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Button size="sm" onClick={() => openUpgradeModal()}>
              <Zap className="h-3 w-3 mr-1" />
              Upgrade to Pro &mdash; $149/month
            </Button>
            <Button size="sm" variant="outline" onClick={() => openUpgradeModal()}>
              Upgrade to Enterprise &mdash; $399/month
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-2" style={{ fontFamily: "var(--font-mono-alt)" }}>
            Free plan limits: 1 service &middot; 2 clients &middot; 2 AI/month
          </p>
        </div>
      )}

      {/* ── Agent Status Strip ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 rounded-lg px-4 py-2.5"
        style={{
          backgroundColor: "#111111",
          border: "1px solid #1e1e1e",
        }}
      >
        {Object.values(AGENTS).map((agent) => (
          <div key={agent.id} className="flex items-center gap-1.5 group relative">
            <span
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: agent.color }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "#888888", fontFamily: "var(--font-mono-alt)" }}
            >
              {agent.name}
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-popover border border-border text-left whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              <p className="text-xs font-semibold text-foreground">{agent.name}</p>
              <p className="text-[11px] text-muted-foreground">{agent.title}</p>
            </div>
          </div>
        ))}
        <span
          className="ml-auto text-xs"
          style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
        >
          All agents active
        </span>
      </div>

      {/* ── Horizon Market Intelligence ────────────────────────────── */}
      <HorizonDigestCard digest={horizonDigest} digestId={horizonDigestId} />

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

      {/* Getting started checklist removed — guided tour replaces it */}

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

      </div>
      {/* ── RIGHT COLUMN — Chat Panel ─────────────────────────────────── */}
      <div className="sticky top-20 hidden lg:block">
        {chatContext && <ChatPanel context={chatContext} />}
      </div>
      {/* ── Mobile chat (stacked below on small screens) ──────────────── */}
      <div className="lg:hidden">
        {chatContext && <ChatPanel context={chatContext} />}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PricingHealthContent({ data }: { data: PricingHealthSummary }) {
  void data; return null; // Removed from dashboard — kept to prevent import errors
}

function ProposalStatsContent({ stats }: { stats: { total: number; drafts: number; sent: number } }) {
  void stats; return null;
}

// ── DELETED: Old intelligence cards, practice intel, activity feed, scout nudges,
// revenue by service, zero-state hero — all moved to Portfolio Intelligence page.
// The orphaned JSX from those sections has been removed.

// ── LEGACY MARKER — DO NOT ADD CODE BETWEEN HERE AND PortfolioHealthGrid ────
// (The code below was formerly inline sub-components. PortfolioHealthGrid is
// still used by the dashboard but the other cards have been removed.)

// Old sections removed — see Portfolio Intelligence page
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
