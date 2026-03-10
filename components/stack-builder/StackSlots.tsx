"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { STACK_CATEGORIES } from "@/lib/stack-builder/seed";
import type { BundleState } from "@/lib/stack-builder/types";

interface StackSlotsProps {
  bundleState: BundleState;
  onRemoveTool: (categoryId: string, toolId: string) => void;
}

export function StackSlots({ bundleState, onRemoveTool }: StackSlotsProps) {
  const missingCore = STACK_CATEGORIES.filter(
    (c) => c.isCoreRequired && (bundleState.selectedByCategory[c.id]?.length ?? 0) === 0
  );

  return (
    <div className="space-y-1">
      {STACK_CATEGORIES.filter((c) => c.id !== "other").map((category) => {
        const tools = bundleState.selectedByCategory[category.id] ?? [];
        const isEmpty = tools.length === 0;
        const isCore = category.isCoreRequired;

        return (
          <div
            key={category.id}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 border transition-all",
              !isEmpty
                ? "border-border/60 bg-white/[0.03]"
                : isCore
                  ? "border-amber-500/15 bg-amber-500/[0.03]"
                  : "border-border/25 bg-transparent"
            )}
          >
            {/* Category color dot */}
            <div
              className="h-2 w-2 rounded-full flex-shrink-0 mt-px"
              style={{
                backgroundColor: category.color,
                boxShadow: isEmpty ? "none" : `0 0 6px ${category.color}55`,
              }}
            />

            {/* Category label */}
            <div className="flex items-center gap-1 flex-shrink-0 w-[136px] min-w-0">
              <span
                className={cn(
                  "text-[11px] truncate",
                  isEmpty ? "text-muted-foreground/40" : "text-foreground/75"
                )}
              >
                {category.name}
              </span>
              {isCore && isEmpty && (
                <span className="text-[8px] font-semibold text-amber-500/60 tracking-wide border border-amber-500/25 rounded px-1 flex-shrink-0">
                  CORE
                </span>
              )}
            </div>

            {/* Tool chips */}
            <div className="flex-1 flex items-center gap-1 overflow-hidden min-w-0">
              <AnimatePresence mode="popLayout">
                {tools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="group flex items-center gap-1 rounded-md border px-1.5 py-0.5 flex-shrink-0 max-w-[110px]"
                    style={{
                      backgroundColor: `${category.color}12`,
                      borderColor: `${category.color}30`,
                    }}
                  >
                    <span
                      className="text-[10px] font-medium truncate"
                      style={{ color: category.color }}
                    >
                      {tool.vendor}
                    </span>
                    <button
                      onClick={() => onRemoveTool(category.id, tool.id)}
                      className="h-3 w-3 rounded-sm flex items-center justify-center flex-shrink-0 text-muted-foreground/40 hover:text-red-400 transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isEmpty && isCore && (
                <motion.span
                  animate={{ opacity: [0.35, 0.7, 0.35] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[10px] text-amber-500/50 italic"
                >
                  add a tool →
                </motion.span>
              )}

              {isEmpty && !isCore && (
                <span className="text-[10px] text-muted-foreground/20">—</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Missing core nudge */}
      <AnimatePresence>
        {missingCore.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-start gap-2 rounded-lg px-3 py-2.5 border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400/75"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
            <span className="leading-relaxed">
              <span className="font-semibold text-amber-400">Missing core layers: </span>
              {missingCore.map((c) => c.name).join(", ")} — these are critical for a complete
              security offering.
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
