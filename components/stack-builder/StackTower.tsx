"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { STACK_CATEGORIES } from "@/lib/stack-builder/seed";
import { normalizeCategoryCosts } from "@/lib/stack-builder/calc";
import type { PricingSnapshot, BundleState } from "@/lib/stack-builder/types";

const TOWER_HEIGHT = 280; // px — total visual height
const MIN_FILLED_HEIGHT = 18; // px — minimum layer height when a tool exists
const GHOST_HEIGHT = 8; // px — placeholder height for empty categories

interface StackTowerProps {
  bundleState: BundleState;
  pricing: PricingSnapshot;
}

interface LayerTooltipProps {
  category: (typeof STACK_CATEGORIES)[number];
  toolCount: number;
  costShare: number;
  isVisible: boolean;
}

function LayerTooltip({ category, toolCount, costShare, isVisible }: LayerTooltipProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.12 }}
          className="absolute right-[calc(100%+8px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl whitespace-nowrap min-w-[160px]">
            <div className="flex items-center gap-1.5 mb-1">
              <span>{category.icon}</span>
              <span className="text-xs font-semibold text-foreground">{category.name}</span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <div className="flex justify-between gap-4">
                <span>Tools</span>
                <span className="font-mono text-foreground">{toolCount}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Cost share</span>
                <span className="font-mono text-foreground">
                  {(costShare * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          {/* Arrow */}
          <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 border-4 border-transparent border-l-border" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StackTower({ bundleState, pricing }: StackTowerProps) {
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const normalized = normalizeCategoryCosts(
    pricing.perCategoryCost,
    STACK_CATEGORIES.map((c) => c.id)
  );

  // Total cost to compute cost-share %
  const totalCost = pricing.totalCostMonthly || 1;

  // Categories with tools get height proportional to cost; empty get ghost height
  const layers = STACK_CATEGORIES.map((cat) => {
    const tools = bundleState.selectedByCategory[cat.id] ?? [];
    const hasTools = tools.length > 0;
    const norm = normalized[cat.id] ?? 0;
    const height = hasTools
      ? Math.max(MIN_FILLED_HEIGHT, Math.round(norm * TOWER_HEIGHT * 0.85))
      : GHOST_HEIGHT;
    const costShare = (pricing.perCategoryCost[cat.id] ?? 0) / totalCost;
    return { cat, tools, hasTools, height, costShare };
  });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Stack Tower
        </span>
        <span className="text-[10px] text-muted-foreground">
          {pricing.categoriesFilled}/{pricing.totalCategories} layers
        </span>
      </div>

      {/* Tower container */}
      <div
        className="relative flex flex-col-reverse gap-0.5 items-stretch"
        style={{ height: TOWER_HEIGHT, width: 64 }}
      >
        {layers.map(({ cat, tools, hasTools, height, costShare }) => (
          <div
            key={cat.id}
            className="relative"
            onMouseEnter={() => setHoveredCatId(cat.id)}
            onMouseLeave={() => setHoveredCatId(null)}
          >
            <motion.div
              layout
              initial={{ height: 0, opacity: 0 }}
              animate={{
                height,
                opacity: hasTools ? 1 : 0.25,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative rounded-sm overflow-hidden cursor-pointer"
              style={{
                background: hasTools
                  ? `linear-gradient(135deg, ${cat.color}cc, ${cat.color}88)`
                  : "transparent",
                border: `1px solid ${cat.color}${hasTools ? "50" : "20"}`,
                boxShadow: hasTools && hoveredCatId === cat.id
                  ? `0 0 12px 2px ${cat.color}40`
                  : hasTools
                    ? `0 0 4px 0 ${cat.color}20`
                    : "none",
              }}
            >
              {/* Inner glow on fill */}
              {hasTools && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, ${cat.color}30 0%, transparent 60%)`,
                  }}
                />
              )}

              {/* Icon (only when tall enough) */}
              {hasTools && height >= 22 && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] opacity-80">
                  {cat.icon}
                </div>
              )}
            </motion.div>

            {/* Tooltip */}
            <LayerTooltip
              category={cat}
              toolCount={tools.length}
              costShare={costShare}
              isVisible={hoveredCatId === cat.id}
            />
          </div>
        ))}
      </div>

      {/* Coverage % label */}
      <div className="text-center">
        <motion.p
          key={pricing.coverageScore}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-lg font-bold font-mono text-foreground"
        >
          {(pricing.coverageScore * 100).toFixed(0)}%
        </motion.p>
        <p className="text-[10px] text-muted-foreground">coverage</p>
      </div>
    </div>
  );
}
