"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "./recommendation-card";
import {
  getCompletedRecommendations,
  extractRecommendations,
} from "@/lib/recommend/stream";
import { calculatePricing } from "@/lib/pricing/engine";
import type { BundleRecommendation, ClientProfile } from "@/lib/types/recommend";
import type { Tool, PricingToolInput } from "@/lib/types";

interface RecommendationGridProps {
  clientProfile: ClientProfile;
  toolCatalog: Tool[];
  workspaceSettings: {
    red_zone_margin_pct: number;
    max_discount_no_approval_pct: number;
  };
  onStartOver: () => void;
}

function buildPricingForRecommendation(
  rec: BundleRecommendation,
  toolCatalog: Tool[],
  seatCount: number,
  redZone: number,
  maxDiscount: number
): BundleRecommendation {
  const s = rec.suggestedSettings;
  const pricingTools: PricingToolInput[] = (rec.toolIds ?? [])
    .map((id) => toolCatalog.find((t) => t.id === id))
    .filter((t): t is Tool => !!t)
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      pricing_model: tool.pricing_model,
      per_seat_cost: Number(tool.per_seat_cost),
      flat_monthly_cost: Number(tool.flat_monthly_cost),
      tier_rules: tool.tier_rules ?? [],
      vendor_minimum_monthly: tool.vendor_minimum_monthly
        ? Number(tool.vendor_minimum_monthly)
        : null,
      labor_cost_per_seat: tool.labor_cost_per_seat
        ? Number(tool.labor_cost_per_seat)
        : null,
      quantity_multiplier: 1,
      annual_flat_cost: tool.annual_flat_cost,
      per_user_cost: tool.per_user_cost,
      per_org_cost: tool.per_org_cost,
      percent_discount: tool.percent_discount,
      flat_discount: tool.flat_discount,
      min_monthly_commit: tool.min_monthly_commit,
      tier_metric: tool.tier_metric,
    }));

  const pricing = calculatePricing({
    tools: pricingTools,
    seat_count: seatCount,
    target_margin_pct: s.targetMarginPct,
    overhead_pct: s.overheadPct,
    labor_pct: s.laborPct,
    discount_pct: s.discountPct,
    red_zone_margin_pct: redZone,
    max_discount_no_approval_pct: maxDiscount,
    contract_term_months: s.contractTermMonths,
  });

  return { ...rec, pricing };
}

export function RecommendationGrid({
  clientProfile,
  toolCatalog,
  workspaceSettings,
  onStartOver,
}: RecommendationGridProps) {
  const [, setBuffer] = useState("");
  const [recommendations, setRecommendations] = useState<BundleRecommendation[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const processBuffer = useCallback(
    (buf: string) => {
      const rawRecs = extractRecommendations(buf);
      const completed = getCompletedRecommendations(buf);

      const enriched = rawRecs.map((raw, idx) => {
        const rec = raw as unknown as BundleRecommendation;
        const isComplete = idx < completed && !!(rec.reasoning?.sellingPoints?.length);
        if (isComplete && !rec.pricing) {
          return buildPricingForRecommendation(
            rec,
            toolCatalog,
            clientProfile.seatCount,
            Number(workspaceSettings.red_zone_margin_pct),
            Number(workspaceSettings.max_discount_no_approval_pct)
          );
        }
        return rec;
      });

      setRecommendations(enriched);
      setCompletedCount(completed);
    },
    [toolCatalog, clientProfile.seatCount, workspaceSettings]
  );

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function startStream() {
      setIsStreaming(true);
      setStreamError(null);
      setBuffer("");
      setRecommendations([]);
      setCompletedCount(0);

      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientProfile),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            // Check if it's an error object
            try {
              const obj = JSON.parse(payload);
              if (typeof obj === "object" && obj !== null && "error" in obj) {
                throw new Error((obj as { error: string }).error);
              }
              if (typeof obj === "string") {
                accumulated += obj;
              }
            } catch (parseErr) {
              if ((parseErr as Error).message !== "Unexpected end of JSON input") {
                // It's a real error or already logged
              }
            }
          }

          setBuffer(accumulated);
          processBuffer(accumulated);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStreamError((err as Error).message ?? "Stream failed");
      } finally {
        setIsStreaming(false);
      }
    }

    startStream();
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetry() {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamError(null);
    setBuffer("");
    setRecommendations([]);
    setCompletedCount(0);
    setIsStreaming(true);
    // Re-trigger by remounting — handled by parent's key prop on this component
    // For simplicity, we just re-run the same effect by re-mounting
    window.location.reload();
  }

  // Tier order for display
  const tiers: BundleRecommendation["tier"][] = ["essential", "recommended", "premium"];

  // Show at least skeleton cards while streaming
  const displayRecs = tiers.map((tier) => {
    const found = recommendations.find((r) => r.tier === tier);
    return found ?? ({ tier, name: "", description: "", toolIds: [], reasoning: { whyTheseTools: "", coverageGaps: "", complianceNotes: "", sellingPoints: [] }, suggestedSettings: { targetMarginPct: 0, overheadPct: 0, laborPct: 0, contractTermMonths: 12, riskTier: "medium" as const, discountPct: 0 } } as BundleRecommendation);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Recommendations for{" "}
            <span className="text-primary">{clientProfile.clientName}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientProfile.seatCount} seats · {clientProfile.industry} ·{" "}
            {completedCount} of 3 complete
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onStartOver} className="gap-2">
          <RotateCcw className="h-3.5 w-3.5" />
          Start Over
        </Button>
      </div>

      {/* Error banner */}
      {streamError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">Generation failed</p>
            <p className="text-xs text-red-400/80 mt-0.5">{streamError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry} className="gap-1.5 flex-shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      )}

      {/* 3-column recommendation cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {displayRecs.map((rec) => (
          <RecommendationCard
            key={rec.tier}
            recommendation={rec}
            isComplete={recommendations.findIndex((r) => r.tier === rec.tier) < completedCount && !!(rec.name)}
            isStreaming={isStreaming}
            clientProfile={clientProfile}
            toolCatalog={toolCatalog}
          />
        ))}
      </div>
    </div>
  );
}
