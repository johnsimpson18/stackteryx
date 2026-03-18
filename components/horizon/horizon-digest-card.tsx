"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentBadge } from "@/components/agents/agent-badge";
import { TrendItem } from "./trend-item";
import type { HorizonDigest } from "@/types/horizon";

interface HorizonDigestCardProps {
  digest: HorizonDigest | null;
  digestId: string | null;
}

export function HorizonDigestCard({
  digest: initialDigest,
  digestId,
}: HorizonDigestCardProps) {
  const [digest, setDigest] = useState(initialDigest);
  const [expanded, setExpanded] = useState(false);
  const [generating, startGeneration] = useTransition();

  function handleGenerate() {
    startGeneration(async () => {
      try {
        const res = await fetch("/api/horizon/generate", { method: "POST" });
        if (res.ok) {
          const { digest: newDigest } = await res.json();
          setDigest(newDigest);
        }
      } catch {
        // Failed — user can try again
      }
    });
  }

  // Empty state
  if (!digest) {
    return (
      <div
        className="rounded-xl"
        style={{
          background: "#111111",
          border: "1px solid #1e1e1e",
          padding: 20,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AgentBadge agentId="horizon" size="sm" showTitle={false} />
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Horizon &middot; Market Intelligence
          </span>
        </div>
        <p
          className="text-sm text-muted-foreground mb-4"
          style={{ fontFamily: "var(--font-mono-alt)" }}
        >
          Your weekly MSP market intelligence digest will appear here every
          Monday morning.
        </p>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              Generate This Week&apos;s Digest
              <RefreshCw className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    );
  }

  // Get all items sorted by impact for collapsed view
  const allItems = [
    ...digest.technologyShifts,
    ...digest.mspBusinessTrends,
    ...digest.competitiveIntelligence,
  ].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });

  const topItems = allItems.slice(0, 3);
  const remainingCount = allItems.length - 3;

  return (
    <div
      className="rounded-xl"
      style={{
        background: "#111111",
        border: "1px solid #1e1e1e",
        padding: 20,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AgentBadge agentId="horizon" size="sm" showTitle={false} />
          <span
            className="text-sm font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Horizon &middot; Market Intelligence
          </span>
          <span
            suppressHydrationWarning
            className="text-xs"
            style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
          >
            {digest.weekLabel}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: "#EF9F27", fontFamily: "var(--font-mono-alt)" }}
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Read Full Digest <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {!expanded ? (
        /* Collapsed — top 3 headlines */
        <div>
          {topItems.map((item) => (
            <TrendItem key={item.id} item={item} compact />
          ))}
          {remainingCount > 0 && (
            <p
              className="text-xs mt-2"
              style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
            >
              + {remainingCount} more insight{remainingCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      ) : (
        /* Expanded — full digest */
        <div className="space-y-5">
          {/* Technology Shifts */}
          <DigestSection
            title="Technology Shifts"
            items={digest.technologyShifts}
          />

          {/* MSP Business Trends */}
          <DigestSection
            title="MSP Business Trends"
            items={digest.mspBusinessTrends}
          />

          {/* Competitive Intelligence */}
          <DigestSection
            title="Competitive Intelligence"
            items={digest.competitiveIntelligence}
          />

          {/* Footer */}
          <div
            className="pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid #1e1e1e" }}
          >
            <p
              className="text-[10px]"
              style={{ color: "#444444", fontFamily: "var(--font-mono-alt)" }}
            >
              Generated by Horizon using web search + knowledge base
              {digest.modelKnowledgeDate &&
                ` · Knowledge current as of: ${digest.modelKnowledgeDate}`}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs gap-1"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DigestSection({
  title,
  items,
}: {
  title: string;
  items: HorizonDigest["technologyShifts"];
}) {
  return (
    <div>
      <div
        className="text-[11px] font-semibold uppercase tracking-wider pb-2 mb-1"
        style={{
          color: "#EF9F27",
          fontFamily: "var(--font-mono-alt)",
          borderBottom: "2px solid #EF9F27",
        }}
      >
        {title}
      </div>
      {items.map((item) => (
        <TrendItem key={item.id} item={item} />
      ))}
    </div>
  );
}
