"use client";

import type { ReactNode } from "react";
import { usePlanContext } from "@/components/providers/plan-provider";
import { useUpgradeModal } from "@/components/billing/upgrade-modal";
import { Lock } from "lucide-react";
import type { LimitKey } from "@/lib/plans";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlanGateProps {
  limitKey: LimitKey;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PlanGate({ limitKey, children, fallback }: PlanGateProps) {
  const { isAtLimit } = usePlanContext();
  const { openUpgradeModal } = useUpgradeModal();

  // Within limit — pass through
  if (!isAtLimit(limitKey)) return <>{children}</>;

  // At limit — show locked state
  if (fallback) {
    return (
      <div onClick={() => openUpgradeModal(limitKey)} className="cursor-pointer">
        {fallback}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={() => openUpgradeModal(limitKey)}
            className="relative cursor-pointer inline-flex"
          >
            <div className="opacity-40 pointer-events-none select-none">
              {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Upgrade to Pro to unlock this feature</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
