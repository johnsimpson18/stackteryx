"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/status-badge";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { cn } from "@/lib/utils";
import { BUNDLE_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import {
  AlertTriangle,
  ChevronDown,
  Check,
  Pencil,
  Plus,
  Target,
  Layers,
  Wrench,
  DollarSign,
  Megaphone,
  X,
  UserPlus,
  Briefcase,
} from "lucide-react";
import {
  updateServiceNameAction,
  updateServiceStatusAction,
  dismissActionCardAction,
} from "@/actions/service-profile";
import { OutcomeEditModal } from "./outcome-edit-modal";
import { CapabilitiesEditModal } from "./capabilities-edit-modal";
import { AssignClientModal } from "./assign-client-modal";
import { EnablementSection } from "./enablement-section";
import type {
  Bundle,
  BundleVersion,
  BundleStatus,
  ServiceOutcome,
  ServiceCompleteness,
  AIActionCard,
  ClientWithContracts,
  BundleEnablement,
  PricingFlag,
  BundleVersionAdditionalServiceWithDetails,
  AdditionalServiceCategory,
} from "@/lib/types";

// ── Props ────────────────────────────────────────────────────────────────────

const ADD_SVC_CATEGORY_LABELS: Record<AdditionalServiceCategory, string> = {
  consulting: "Consulting",
  help_desk: "Help Desk",
  retainer: "Retainer",
  training: "Training",
  project: "Project",
  compliance: "Compliance",
};

const ADD_SVC_CATEGORY_COLORS: Record<AdditionalServiceCategory, string> = {
  consulting: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  help_desk: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  retainer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  training: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  project: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  compliance: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

interface ServiceProfileClientProps {
  bundle: Bundle;
  outcome: ServiceOutcome | null;
  completeness: ServiceCompleteness | null;
  versions: BundleVersion[];
  enablementMap: Record<string, boolean>;
  enablement: BundleEnablement | null;
  actionCards: AIActionCard[];
  clients: ClientWithContracts[];
  redZoneMarginPct: number;
  latestVersionId: string | null;
  additionalServices: BundleVersionAdditionalServiceWithDetails[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-400";
  if (margin >= 0.15) return "text-amber-400";
  return "text-red-400";
}

const OUTCOME_TYPE_LABELS: Record<string, string> = {
  compliance: "Compliance",
  efficiency: "Efficiency",
  security: "Risk Reduction",
  growth: "Growth",
  custom: "Custom",
};

// ── Main Component ───────────────────────────────────────────────────────────

export function ServiceProfileClient({
  bundle,
  outcome,
  completeness,
  versions,
  enablementMap,
  enablement,
  actionCards,
  clients,
  redZoneMarginPct,
  latestVersionId,
  additionalServices,
}: ServiceProfileClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Inline name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(bundle.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [capabilitiesModalOpen, setCapabilitiesModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Dismissed cards (optimistic)
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());

  // ── Margin check ─────────────────────────────────────────────────────
  const latestVersion = versions[0] ?? null;
  const latestMargin = latestVersion
    ? Number(latestVersion.computed_margin_post_discount ?? 0)
    : null;
  const isMarginBelowRedZone =
    latestMargin !== null && latestMargin < redZoneMarginPct;

  // ── Action cards to show ─────────────────────────────────────────────
  const visibleCards = actionCards.filter((c) => !dismissedCards.has(c.id));

  // ── Build synthetic action card from completeness/margin ─────────────
  const syntheticCards: { message: string; ctaLabel: string; ctaHref: string }[] = [];

  if (completeness) {
    if (!completeness.outcome_complete) {
      syntheticCards.push({
        message: "This service has no outcome statement — it cannot be published.",
        ctaLabel: "Define Outcome",
        ctaHref: "#",
      });
    }
    if (!completeness.stack_complete) {
      syntheticCards.push({
        message: "No tools have been assigned to this service.",
        ctaLabel: "Select Tools",
        ctaHref: `/services/new?resume=${bundle.id}&step=3`,
      });
    }
    if (!completeness.economics_complete) {
      syntheticCards.push({
        message: "This service has no pricing configuration.",
        ctaLabel: "Configure Pricing",
        ctaHref: `/services/${bundle.id}/versions/new`,
      });
    }
    if (!completeness.enablement_complete) {
      syntheticCards.push({
        message: "Sales enablement content has not been generated for this service.",
        ctaLabel: "Generate Content",
        ctaHref: "#enablement",
      });
    }
  }

  if (isMarginBelowRedZone && latestMargin !== null) {
    syntheticCards.push({
      message: `Service margin (${formatPercent(latestMargin)}) is below the red zone threshold (${formatPercent(redZoneMarginPct)}).`,
      ctaLabel: "Review Pricing",
      ctaHref: latestVersionId ? `/services/${bundle.id}/versions/${latestVersionId}` : "#",
    });
  }

  const showActionCards = visibleCards.length > 0 || syntheticCards.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────

  function handleNameEdit() {
    setIsEditingName(true);
    setEditName(bundle.name);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  function handleNameSave() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === bundle.name) {
      setIsEditingName(false);
      return;
    }
    startTransition(async () => {
      const result = await updateServiceNameAction(bundle.id, trimmed);
      if (result.success) {
        toast.success("Name updated");
        setIsEditingName(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleStatusChange(status: BundleStatus) {
    startTransition(async () => {
      const result = await updateServiceStatusAction(bundle.id, status);
      if (result.success) {
        toast.success(`Status changed to ${BUNDLE_STATUS_LABELS[status]}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

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
      }
    });
  }

  function handleLayerClick(layer: string) {
    switch (layer) {
      case "outcome":
        setOutcomeModalOpen(true);
        break;
      case "service":
        setCapabilitiesModalOpen(true);
        break;
      case "stack":
        router.push(`/services/new?resume=${bundle.id}&step=3`);
        break;
      case "economics":
        if (versions.length > 0 && latestVersionId) {
          router.push(`/services/${bundle.id}/versions/${latestVersionId}`);
        } else {
          router.push(`/services/${bundle.id}/versions/new`);
        }
        break;
      case "enablement":
        document.getElementById("enablement-section")?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* 1. AI Action Cards */}
      {showActionCards && (
        <div className="space-y-2">
          {/* Real action cards from DB */}
          {visibleCards.map((card) => (
            <div
              key={card.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3",
                card.severity === "critical"
                  ? "bg-red-500/5 border-red-500/20"
                  : card.severity === "warning"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-blue-500/5 border-blue-500/20"
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
                <p className="text-sm text-foreground">{card.title}</p>
                {card.body && (
                  <p className="text-xs text-muted-foreground mt-0.5">{card.body}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {card.cta_href && card.cta_label && (
                  <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                    <Link href={card.cta_href}>{card.cta_label}</Link>
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => handleDismissCard(card.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Synthetic cards from completeness/margin */}
          {syntheticCards.map((card, i) => (
            <div
              key={`synthetic-${i}`}
              className="flex items-start gap-3 rounded-lg border bg-amber-500/5 border-amber-500/20 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
              <p className="text-sm text-foreground flex-1">{card.message}</p>
              {card.ctaHref === "#" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => {
                    if (card.ctaLabel === "Define Outcome") setOutcomeModalOpen(true);
                  }}
                >
                  {card.ctaLabel}
                </Button>
              ) : card.ctaHref === "#enablement" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleLayerClick("enablement")}
                >
                  {card.ctaLabel}
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild className="h-7 text-xs shrink-0">
                  <Link href={card.ctaHref}>{card.ctaLabel}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 2. Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Service name — inline editable */}
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                ref={nameInputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSave();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                className="text-2xl font-bold tracking-tight text-foreground bg-transparent border-b border-primary outline-none"
                style={{ fontFamily: "var(--font-display)" }}
                disabled={isPending}
              />
            ) : (
              <h1
                className="text-2xl font-bold tracking-tight text-foreground cursor-pointer hover:text-primary/80 transition-colors group"
                style={{ fontFamily: "var(--font-display)" }}
                onClick={handleNameEdit}
              >
                {bundle.name}
                <Pencil className="inline h-3.5 w-3.5 ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
              </h1>
            )}
          </div>

          {/* Outcome type badge + statement */}
          <div className="flex items-center gap-2 mt-1.5">
            {outcome?.outcome_type ? (
              <Badge variant="outline" className="text-xs capitalize">
                {OUTCOME_TYPE_LABELS[outcome.outcome_type] ?? outcome.outcome_type}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No Outcome Defined
              </Badge>
            )}

            {/* Status badge + dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="inline-flex items-center gap-1 cursor-pointer">
                  <StatusBadge
                    status={bundle.status as "draft" | "active" | "archived"}
                    label={BUNDLE_STATUS_LABELS[bundle.status]}
                  />
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {(["draft", "active", "archived"] as BundleStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={s === bundle.status || isPending}
                  >
                    {s === bundle.status && <Check className="h-3 w-3 mr-1.5" />}
                    {BUNDLE_STATUS_LABELS[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Outcome statement subtitle */}
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            {outcome?.outcome_statement
              ? outcome.outcome_statement
              : "No outcome statement — add one to publish this service."}
          </p>
        </div>

        {/* Assign to Client */}
        <Button onClick={() => setAssignModalOpen(true)} className="shrink-0 gap-1.5">
          <UserPlus className="h-4 w-4" />
          Assign to Client
        </Button>
      </div>

      {/* 3. Five Layer Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <LayerCard
          label="Outcome"
          icon={Target}
          complete={completeness?.outcome_complete ?? false}
          summary={
            outcome
              ? `${OUTCOME_TYPE_LABELS[outcome.outcome_type] ?? outcome.outcome_type}${outcome.outcome_statement ? ` — ${outcome.outcome_statement.slice(0, 60)}${outcome.outcome_statement.length > 60 ? "..." : ""}` : ""}`
              : "Not defined"
          }
          onClick={() => handleLayerClick("outcome")}
        />
        <LayerCard
          label="Service"
          icon={Layers}
          complete={completeness?.service_complete ?? false}
          summary={
            outcome?.service_capabilities?.length
              ? `${outcome.service_capabilities.length} capabilities defined`
              : "No capabilities"
          }
          onClick={() => handleLayerClick("service")}
        />
        <LayerCard
          label="Stack"
          icon={Wrench}
          complete={completeness?.stack_complete ?? false}
          summary={
            latestVersion
              ? "Tools assigned"
              : "No tools assigned"
          }
          onClick={() => handleLayerClick("stack")}
        />
        <LayerCard
          label="Economics"
          icon={DollarSign}
          complete={completeness?.economics_complete ?? false}
          summary={
            versions.length > 0
              ? `${versions.length} pricing config${versions.length !== 1 ? "s" : ""}${latestMargin !== null ? ` · Est. margin ${formatPercent(latestMargin)}` : ""}`
              : "No pricing yet"
          }
          onClick={() => handleLayerClick("economics")}
        />
        <LayerCard
          label="Enablement"
          icon={Megaphone}
          complete={completeness?.enablement_complete ?? false}
          summary={
            enablement?.generated_at
              ? `Content generated ${new Date(enablement.generated_at).toLocaleDateString()}`
              : "No content yet"
          }
          onClick={() => handleLayerClick("enablement")}
        />
      </div>

      {/* 4. Pricing Configurations */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Each configuration represents a different way to package and price this service for different client segments.
        </p>
        {versions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">No pricing configurations</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add tools and model pricing to complete your service.
              </p>
              <Button size="sm" asChild className="mt-4">
                <Link href={`/services/${bundle.id}/versions/new`}>
                  <Plus className="h-3 w-3 mr-1" />
                  Create Pricing Configuration
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-sm">Pricing Configurations</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/services/${bundle.id}/versions/new`}>
                  <Plus className="h-3 w-3 mr-1" />
                  New Configuration
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Seats</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead>Risk Tier</TableHead>
                    <TableHead>Enablement</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Flags</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((v) => {
                    const margin = Number(v.computed_margin_post_discount ?? 0);
                    const flags = (v.pricing_flags ?? []) as PricingFlag[];
                    const hasEnabl = enablementMap[v.id] ?? false;

                    return (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Link
                            href={`/services/${bundle.id}/versions/${v.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            v{v.version_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">{v.seat_count}</TableCell>
                        <TableCell className="text-right">
                          <MarginHealthBadge margin={margin} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(Number(v.computed_mrr ?? 0))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatPercent(Number(v.discount_pct))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {v.risk_tier}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {hasEnabl ? (
                            <Link href={`/services/${bundle.id}/versions/${v.id}?tab=enablement`}>
                              <Badge
                                variant="secondary"
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
                              >
                                Enabled
                              </Badge>
                            </Link>
                          ) : (
                            <Link
                              href={`/services/${bundle.id}/versions/${v.id}?tab=enablement`}
                              className="text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              Generate →
                            </Link>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {flags.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="secondary"
                                    className={
                                      flags.some((f) => f.severity === "error")
                                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }
                                  >
                                    {flags.length}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {flags.map((f, i) => (
                                    <p key={i} className="text-xs">{f.message}</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4b. Additional Services */}
      {additionalServices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Add-On Services ({additionalServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {additionalServices.map((as) => (
                  <TableRow key={as.id}>
                    <TableCell className="font-medium">
                      {as.additional_service.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          ADD_SVC_CATEGORY_COLORS[as.additional_service.category]
                        )}
                      >
                        {ADD_SVC_CATEGORY_LABELS[as.additional_service.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(as.effective_cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(as.effective_sell_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <MarginHealthBadge margin={as.effective_margin_pct / 100} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Revenue layers bar */}
            {latestVersion && (() => {
              const toolMrr = Number(latestVersion.computed_mrr ?? 0);
              const addOnMrr = additionalServices.reduce(
                (sum, s) => sum + s.effective_sell_price * s.quantity,
                0
              );
              const totalMrr = toolMrr + addOnMrr;
              const toolPct = totalMrr > 0 ? (toolMrr / totalMrr) * 100 : 0;
              const addOnPct = totalMrr > 0 ? (addOnMrr / totalMrr) * 100 : 0;

              return (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Revenue Layers</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatCurrency(totalMrr)}/mo
                    </span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-zinc-800">
                    {toolPct > 0 && (
                      <div
                        className="bg-primary/70 transition-all duration-300"
                        style={{ width: `${toolPct}%` }}
                        title={`Tools: ${formatCurrency(toolMrr)}`}
                      />
                    )}
                    {addOnPct > 0 && (
                      <div
                        className="bg-purple-500/70 transition-all duration-300"
                        style={{ width: `${addOnPct}%` }}
                        title={`Add-Ons: ${formatCurrency(addOnMrr)}`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary/70" />
                      <span className="text-muted-foreground">
                        Tools {formatCurrency(toolMrr)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-purple-500/70" />
                      <span className="text-muted-foreground">
                        Add-Ons {formatCurrency(addOnMrr)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* 5. Sales Enablement Section */}
      <div id="enablement-section">
        <EnablementSection
          enablement={enablement}
          latestVersionId={latestVersionId}
          bundleId={bundle.id}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <OutcomeEditModal
        open={outcomeModalOpen}
        onOpenChange={setOutcomeModalOpen}
        bundleId={bundle.id}
        outcome={outcome}
      />

      <CapabilitiesEditModal
        open={capabilitiesModalOpen}
        onOpenChange={setCapabilitiesModalOpen}
        bundleId={bundle.id}
        capabilities={outcome?.service_capabilities ?? []}
        bundleType={bundle.bundle_type}
      />

      <AssignClientModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        bundleId={bundle.id}
        clients={clients}
        versions={versions}
      />
    </div>
  );
}

// ── Layer Card ────────────────────────────────────────────────────────────────

function LayerCard({
  label,
  icon: Icon,
  complete,
  summary,
  onClick,
}: {
  label: string;
  icon: typeof Target;
  complete: boolean;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all duration-150",
        "hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
        "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0",
            complete
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : summary === "Not defined" || summary === "No capabilities" || summary === "No tools assigned" || summary === "No pricing yet" || summary === "No content yet"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          )}
        >
          {complete ? "Complete" : summary.startsWith("No") || summary === "Not defined" ? "Missing" : "Incomplete"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {summary}
      </p>
    </button>
  );
}
