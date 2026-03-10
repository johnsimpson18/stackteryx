"use client";

import { StackTower } from "./StackTower";
import { StackSlots } from "./StackSlots";
import type { BundleState, PricingSnapshot } from "@/lib/stack-builder/types";

interface StackCanvasProps {
  bundleState: BundleState;
  pricing: PricingSnapshot;
  onRemoveTool: (categoryId: string, toolId: string) => void;
}

export function StackCanvas({ bundleState, pricing, onRemoveTool }: StackCanvasProps) {
  const totalTools = Object.values(bundleState.selectedByCategory).flat().length;

  return (
    <div className="space-y-0">
      {/* Tower visualization */}
      <div className="flex justify-center items-end gap-8 px-6 py-5 border-b border-border/40 bg-gradient-to-b from-white/[0.02] to-transparent">
        <StackTower bundleState={bundleState} pricing={pricing} />

        {/* Quick stats beside tower */}
        <div className="flex flex-col gap-3 pb-2">
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-foreground tabular-nums">
              {totalTools}
            </p>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">Tools</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-foreground tabular-nums">
              {pricing.categoriesFilled}
            </p>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide">
              Layers
            </p>
          </div>
        </div>
      </div>

      {/* Category slots */}
      <div className="px-3 pt-3 pb-3">
        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2 px-1">
          Stack Layers
        </p>
        <StackSlots bundleState={bundleState} onRemoveTool={onRemoveTool} />
      </div>
    </div>
  );
}
