"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContextQualityBadgeProps {
  quality: "rich" | "partial" | "minimal";
  missing?: string[];
}

export function ContextQualityBadge({
  quality,
  missing,
}: ContextQualityBadgeProps) {
  if (quality === "rich") {
    return (
      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
        Ready
      </span>
    );
  }

  if (quality === "partial") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            Partial context
          </span>
        </TooltipTrigger>
        {missing && missing.length > 0 && (
          <TooltipContent side="top">
            <p className="text-xs">
              Missing: {missing.join(", ")}
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
          Missing context
        </span>
      </TooltipTrigger>
      {missing && missing.length > 0 && (
        <TooltipContent side="top">
          <p className="text-xs">
            Missing: {missing.join(", ")}
          </p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
