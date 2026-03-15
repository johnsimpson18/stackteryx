"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { BUNDLE_STATUS_LABELS } from "@/lib/constants";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  DollarSign,
  Layers,
  Package,
  Plus,
  Rocket,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { dismissActionCardAction } from "@/actions/service-profile";
import { PricingHealthWidget } from "@/components/dashboard/pricing-health-widget";
import type {
  AIActionCard,
  BundleWithMeta,
  ServiceCompleteness,
  ToolCategory,
} from "@/lib/types";
import type { PricingHealthSummary } from "@/lib/db/dashboard";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChecklistSteps {
  hasVendors: boolean;
  hasServices: boolean;
  hasProposals: boolean;
  hasClients: boolean;
}

interface DashboardStats {
  activeServices: number;
  portfolioMrr: number;
  avgMargin: number | null;
  activeClients: number;
  outcomeTypeCoverage: number;
  servicesNeedingAttention: number;
}

interface DashboardClientProps {
  checklist: ChecklistSteps | null;
  actionCards: AIActionCard[];
  stats: DashboardStats;
  bundles: BundleWithMeta[];
  completeness: ServiceCompleteness[];
  toolsByCategory: Record<string, number>;
  inProgressBundle: { id: string; name: string; updatedAt: string } | null;
  defaultTargetMargin: number;
  stalePricingCount?: number;
  pricingHealth?: PricingHealthSummary | null;
}

// ── CTA route map for action card types ──────────────────────────────────────

const ACTION_CARD_ROUTES: Record<string, string> = {
  incomplete_service: "/services",
  margin_risk: "/services",
  renewal_alert: "/clients",
  stale_proposal: "/sales-studio",
  vendor_cost_change: "/stack-catalog",
};

// ── Outcome type labels ──────────────────────────────────────────────────────

// ── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function DashboardClient({
  checklist,
  actionCards,
  stats,
  bundles,
  completeness,
  toolsByCategory,
  inProgressBundle,
  defaultTargetMargin,
  stalePricingCount = 0,
  pricingHealth,
}: DashboardClientProps) {
  const [, startTransition] = useTransition();
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [continueCardDismissed, setContinueCardDismissed] = useState(false);
  const [filterNeedingAttention, setFilterNeedingAttention] = useState(false);

  const hasServices = bundles.length > 0;

  // ── Action card handlers ─────────────────────────────────────────────────

  function handleDismissCard(cardId: string) {
    setDismissedCards((prev) => new Set([...prev, cardId]));
    startTransition(async () => {
      const result = await dismissActionCardAction(cardId);
      if (!result.success) {
        setDismissedCards((prev) => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        toast.error("Failed to dismiss");
      }
    });
  }

  function getCardCtaHref(card: AIActionCard): string {
    if (card.cta_href) return card.cta_href;
    const base = ACTION_CARD_ROUTES[card.card_type] ?? "/dashboard";
    return card.entity_id ? `${base}/${card.entity_id}` : base;
  }

  const visibleCards = actionCards.filter((c) => !dismissedCards.has(c.id));

  // ── Portfolio Health Grid data ───────────────────────────────────────────

  const completenessMap = new Map(
    completeness.map((c) => [c.bundle_id, c])
  );

  const gridBundles = bundles
    .filter((b) => b.status !== "archived")
    .map((b) => ({
      bundle: b,
      completeness: completenessMap.get(b.id) ?? null,
    }))
    .sort((a, b) => {
      const aLayers = a.completeness?.layers_complete ?? 0;
      const bLayers = b.completeness?.layers_complete ?? 0;
      return aLayers - bLayers;
    });

  const filteredGridBundles = filterNeedingAttention
    ? gridBundles.filter((g) => (g.completeness?.layers_complete ?? 0) < 3)
    : gridBundles;

  // ── Margin color helper ──────────────────────────────────────────────────

  function marginAccent(): "emerald" | "amber" | "red" | "lime" {
    if (stats.avgMargin === null) return "lime";
    if (stats.avgMargin >= defaultTargetMargin) return "emerald";
    if (stats.avgMargin >= defaultTargetMargin - 0.05) return "amber";
    return "red";
  }

  // ── Severity sort value (for display ordering) ──────────────────────────

  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  const sortedCards = [...visibleCards].sort((a, b) => {
    const aSev = severityOrder[a.severity] ?? 2;
    const bSev = severityOrder[b.severity] ?? 2;
    if (aSev !== bSev) return aSev - bSev;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
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

      {/* 1. Getting Started Checklist */}
      {checklist && <GettingStartedChecklist steps={checklist} />}

      {/* Continue Where You Left Off */}
      {inProgressBundle && !continueCardDismissed && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              You have an unfinished service
            </p>
            <p className="text-xs text-muted-foreground">
              {inProgressBundle.name} — last edited{" "}
              {relativeTime(inProgressBundle.updatedAt)}
            </p>
          </div>
          <Button size="sm" asChild className="shrink-0">
            <Link href={`/services/new?resume=${inProgressBundle.id}`}>
              Continue
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setContinueCardDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stale Pricing Alert */}
      {stalePricingCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border-l-[3px] border-l-amber-500 border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {stalePricingCount} service{stalePricingCount !== 1 ? "s have" : " has"} stale pricing
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tool costs have changed since these prices were last calculated.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="h-7 text-xs shrink-0">
            <Link href="/services?filter=stale">
              Review
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {/* 2. AI Action Cards */}
      <ActionCardsSection
        cards={sortedCards}
        onDismiss={handleDismissCard}
        getCtaHref={getCardCtaHref}
      />

      {/* 3. Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active Services"
          value={String(stats.activeServices)}
          sub={`${bundles.length} total`}
          icon={<Package className="h-4 w-4" />}
          accent="cyan"
        />
        <StatCard
          label="Portfolio MRR"
          value={formatCurrency(stats.portfolioMrr)}
          sub={`${formatCurrency(stats.portfolioMrr * 12)} ARR`}
          icon={<DollarSign className="h-4 w-4" />}
          accent="emerald"
        />
        <StatCard
          label="Avg Margin"
          value={stats.avgMargin !== null ? formatPercent(stats.avgMargin) : "—"}
          sub={
            stats.avgMargin !== null
              ? `Target: ${formatPercent(defaultTargetMargin)}`
              : "No active configs"
          }
          icon={<TrendingUp className="h-4 w-4" />}
          accent={marginAccent()}
        />
        <StatCard
          label="Active Clients"
          value={String(stats.activeClients)}
          sub="with active services"
          icon={<Users className="h-4 w-4" />}
          accent="lime"
        />
        <StatCard
          label="Portfolio Coverage"
          value={`${stats.outcomeTypeCoverage} / 4`}
          sub="outcome types"
          icon={<Target className="h-4 w-4" />}
          accent={stats.outcomeTypeCoverage >= 3 ? "emerald" : stats.outcomeTypeCoverage >= 2 ? "amber" : "lime"}
        />
        <StatCard
          label="Needs Attention"
          value={String(stats.servicesNeedingAttention)}
          sub={stats.servicesNeedingAttention === 1 ? "service incomplete" : "services incomplete"}
          icon={<Layers className="h-4 w-4" />}
          accent={stats.servicesNeedingAttention > 0 ? "amber" : "emerald"}
          onClick={
            stats.servicesNeedingAttention > 0
              ? () => setFilterNeedingAttention((prev) => !prev)
              : undefined
          }
          active={filterNeedingAttention}
        />
      </div>

      {/* Pricing Health Widget */}
      {pricingHealth && (
        <PricingHealthWidget data={pricingHealth} />
      )}

      {/* 4. Build a Service hero CTA (zero services state) */}
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

      {/* 5. Portfolio Health Grid */}
      <PortfolioHealthGrid
        items={filteredGridBundles}
        isFiltered={filterNeedingAttention}
        onClearFilter={() => setFilterNeedingAttention(false)}
        hasServices={hasServices}
      />

      {/* 6. Portfolio Coverage */}
      <PortfolioCoverage toolsByCategory={toolsByCategory} />
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

// ── AI Action Cards Section ──────────────────────────────────────────────────

function ActionCardsSection({
  cards,
  onDismiss,
  getCtaHref,
}: {
  cards: AIActionCard[];
  onDismiss: (id: string) => void;
  getCtaHref: (card: AIActionCard) => string;
}) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1">
        No issues flagged. Your portfolio looks healthy.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <div
          key={card.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border-l-[3px] border px-4 py-3 transition-all duration-200",
            card.severity === "critical"
              ? "border-l-red-500 bg-red-500/5 border-red-500/20"
              : card.severity === "warning"
                ? "border-l-amber-500 bg-amber-500/5 border-amber-500/20"
                : "border-l-blue-500 bg-blue-500/5 border-blue-500/20"
          )}
        >
          <AlertTriangle
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              card.severity === "critical"
                ? "text-red-400"
                : card.severity === "warning"
                  ? "text-amber-400"
                  : "text-blue-400"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{card.title}</p>
            {card.body && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {card.body}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" asChild className="h-7 text-xs">
              <Link href={getCtaHref(card)}>
                {card.cta_label ?? "View"}
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => onDismiss(card.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "lime",
  onClick,
  active,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent?: "lime" | "emerald" | "amber" | "cyan" | "red";
  onClick?: () => void;
  active?: boolean;
}) {
  const accentMap = {
    lime: "via-[#A8FF3E]/40",
    emerald: "via-emerald-500/40",
    amber: "via-amber-500/40",
    cyan: "via-cyan-500/40",
    red: "via-red-500/40",
  };

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left",
        onClick && "cursor-pointer hover:border-primary/30 transition-colors",
        active && "border-primary/40 bg-primary/5"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          accentMap[accent]
        )}
      />
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="p-1 rounded-lg bg-white/5 text-muted-foreground">
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </Wrapper>
  );
}

// ── Portfolio Health Grid ────────────────────────────────────────────────────

const LAYER_LABELS = ["Outcome", "Service", "Stack", "Economics", "Enablement"];
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
  hasServices,
}: {
  items: { bundle: BundleWithMeta; completeness: ServiceCompleteness | null }[];
  isFiltered: boolean;
  onClearFilter: () => void;
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
          <p className="text-sm text-muted-foreground">
            No services yet.
          </p>
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

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground">
          Portfolio Health
        </h2>
        {isFiltered && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Show all services
            <X className="h-3 w-3" />
          </button>
        )}
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
                {/* Name + outcome type */}
                <div className="min-w-0">
                  <Link
                    href={`/services/${bundle.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {bundle.name}
                  </Link>
                </div>

                {/* Status */}
                <div className="w-20 flex justify-center">
                  <StatusBadge
                    status={bundle.status as "draft" | "active" | "archived"}
                    label={BUNDLE_STATUS_LABELS[bundle.status]}
                  />
                </div>

                {/* Five layer bar */}
                <div className="w-[200px] flex items-center gap-1">
                  {layers.map((complete, i) => (
                    <div
                      key={i}
                      className="relative group flex-1"
                    >
                      <div
                        className={cn(
                          "h-5 rounded-sm transition-colors",
                          complete
                            ? "bg-emerald-500/60"
                            : "bg-red-500/30"
                        )}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-popover border border-border text-[10px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {LAYER_LABELS[i]}: {complete ? "Complete" : "Incomplete"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Score */}
                <div className="w-12 text-right">
                  <span
                    className={cn(
                      "text-xs font-mono font-medium",
                      layersComplete >= 5
                        ? "text-emerald-400"
                        : layersComplete >= 3
                          ? "text-amber-400"
                          : "text-red-400"
                    )}
                  >
                    {layersComplete} / 5
                  </span>
                </div>

                {/* Arrow */}
                <Link href={`/services/${bundle.id}`} className="w-5 flex justify-center">
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

// ── Portfolio Coverage ───────────────────────────────────────────────────────

function PortfolioCoverage({
  toolsByCategory,
}: {
  toolsByCategory: Record<string, number>;
}) {
  const DOMAINS: { label: string; categories: ToolCategory[] }[] = [
    { label: "Identity", categories: ["identity", "mfa"] },
    { label: "Endpoint", categories: ["edr"] },
    { label: "Network", categories: ["dns_filtering", "network_monitoring"] },
    { label: "Cloud", categories: ["other"] },
    { label: "Data", categories: ["backup"] },
    { label: "SOC / SIEM", categories: ["siem"] },
    { label: "Backup", categories: ["backup"] },
    { label: "Compliance", categories: ["security_awareness_training", "documentation"] },
    { label: "Productivity", categories: ["rmm", "psa"] },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Portfolio Coverage
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Security domains in your tool library
          </p>
        </div>
        <Link
          href="/stack-catalog"
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
        >
          View stack catalog
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {DOMAINS.map((domain) => {
          const count = domain.categories.reduce(
            (sum, cat) => sum + (toolsByCategory[cat] ?? 0),
            0
          );
          const covered = count > 0;

          return (
            <div
              key={domain.label}
              className={cn(
                "rounded-lg border p-3 text-center transition-colors",
                covered
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-red-500/5 border-red-500/20"
              )}
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full mx-auto mb-2",
                  covered ? "bg-emerald-500" : "bg-red-500/40"
                )}
              />
              <p className="text-xs font-medium text-foreground">
                {domain.label}
              </p>
              <p
                className={cn(
                  "text-[10px] mt-0.5",
                  covered ? "text-emerald-400" : "text-red-400/60"
                )}
              >
                {covered ? `${count} tool${count !== 1 ? "s" : ""}` : "Uncovered"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
