"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  Sparkles,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/constants";
import { PricingSummary } from "./pricing-summary";
import { createBundleFromRecommendation } from "@/actions/bundles";
import type { BundleRecommendation, ClientProfile } from "@/lib/types/recommend";
import type { Tool } from "@/lib/types";

const TIER_CONFIG = {
  essential: {
    label: "Essential",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ring: "border-blue-500/20",
    dot: "bg-blue-500",
  },
  recommended: {
    label: "Recommended",
    badge: "bg-primary/10 text-primary border-primary/20",
    ring: "border-primary/40 shadow-[0_0_0_1px_oklch(0.65_0.18_250/0.2)]",
    dot: "bg-primary",
  },
  premium: {
    label: "Premium",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    ring: "border-purple-500/30",
    dot: "bg-purple-500",
  },
} as const;

interface RecommendationCardProps {
  recommendation: BundleRecommendation;
  isComplete: boolean;
  isStreaming: boolean;
  clientProfile: ClientProfile;
  toolCatalog: Tool[];
}

export function RecommendationCard({
  recommendation,
  isComplete,
  isStreaming,
  clientProfile,
  toolCatalog,
}: RecommendationCardProps) {
  const router = useRouter();
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const tier = recommendation.tier;
  const config = TIER_CONFIG[tier];

  // Resolve tool objects from catalog
  const resolvedTools = (recommendation.toolIds ?? [])
    .map((id) => toolCatalog.find((t) => t.id === id))
    .filter((t): t is Tool => !!t);

  const hasReasoning =
    isComplete &&
    recommendation.reasoning?.whyTheseTools &&
    recommendation.reasoning?.sellingPoints?.length > 0;

  function handleCreate() {
    startTransition(async () => {
      const result = await createBundleFromRecommendation(recommendation, clientProfile);
      if (result.success) {
        toast.success(`"${recommendation.name}" bundle created!`);
        router.push(`/services/${result.data.bundleId}/versions/${result.data.versionId}`);
      } else {
        toast.error(result.error ?? "Failed to create bundle");
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card flex flex-col transition-all duration-300",
        config.ring,
        tier === "recommended" && "relative"
      )}
    >
      {/* Recommended badge */}
      {tier === "recommended" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-0.5 text-xs font-semibold text-primary shadow-sm">
            <Star className="h-3 w-3 fill-primary" />
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
              config.badge
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {config.label}
          </span>

          {/* Streaming status */}
          {isStreaming && !isComplete ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Generating…
            </span>
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          ) : null}
        </div>

        {recommendation.name ? (
          <h3 className="text-base font-bold text-foreground leading-tight">
            {recommendation.name}
          </h3>
        ) : (
          <div className="h-5 w-40 rounded bg-white/8 animate-pulse" />
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Description */}
        {recommendation.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.description}
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="h-3.5 w-full rounded bg-white/8 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-white/8 animate-pulse" />
            <div className="h-3.5 w-4/6 rounded bg-white/8 animate-pulse" />
          </div>
        )}

        {/* Tool list */}
        {recommendation.toolIds?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {resolvedTools.length} Tool{resolvedTools.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-1">
              {resolvedTools.map((tool) => {
                const colors = CATEGORY_COLORS[tool.category];
                return (
                  <div
                    key={tool.id}
                    className="flex items-center gap-2 rounded-lg bg-white/3 px-2.5 py-1.5"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        colors.dot
                      )}
                    />
                    <span className="text-xs font-medium text-foreground flex-1 min-w-0 truncate">
                      {tool.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs rounded px-1.5 py-0.5 flex-shrink-0",
                        colors.bg,
                        colors.text
                      )}
                    >
                      {CATEGORY_LABELS[tool.category]}
                    </span>
                  </div>
                );
              })}
              {/* Show unresolved IDs as placeholders while streaming */}
              {(recommendation.toolIds ?? [])
                .filter((id) => !toolCatalog.find((t) => t.id === id))
                .map((id) => (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-lg bg-white/3 px-2.5 py-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">{id}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Reasoning accordion */}
        {hasReasoning && (
          <div className="border border-border/50 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setReasoningOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/3 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Why these tools?
              </span>
              {reasoningOpen ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {reasoningOpen && (
              <div className="border-t border-border/50 px-3 py-3 space-y-3 bg-white/2">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Selection Logic</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {recommendation.reasoning.whyTheseTools}
                  </p>
                </div>
                {recommendation.reasoning.coverageGaps && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Coverage Gaps</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recommendation.reasoning.coverageGaps}
                    </p>
                  </div>
                )}
                {recommendation.reasoning.complianceNotes && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Compliance</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {recommendation.reasoning.complianceNotes}
                    </p>
                  </div>
                )}
                {recommendation.reasoning.sellingPoints?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1.5">Selling Points</p>
                    <ul className="space-y-1">
                      {recommendation.reasoning.sellingPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Pricing section — shown once complete */}
        {isComplete && recommendation.pricing && (
          <div className="border-t border-border/50 pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Pricing @ {clientProfile.seatCount} seats
            </p>
            <PricingSummary
              pricing={recommendation.pricing}
              seatCount={clientProfile.seatCount}
              budgetPerSeatMax={clientProfile.budgetPerSeatMax}
            />
          </div>
        )}

        {/* Pricing skeleton while streaming */}
        {isStreaming && !isComplete && (
          <div className="border-t border-border/50 pt-3 space-y-2">
            <div className="h-3 w-24 rounded bg-white/8 animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer action */}
      <div className="p-4 pt-0">
        <Button
          onClick={handleCreate}
          disabled={!isComplete || isPending || isStreaming}
          className="w-full gap-2"
          variant={tier === "recommended" ? "default" : "outline"}
          size="sm"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Create Bundle from This
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
