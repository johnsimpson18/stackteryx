"use client";

import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { PricingFlag } from "@/lib/types";

interface PricingFlagsProps {
  flags: PricingFlag[];
}

export function PricingFlags({ flags }: PricingFlagsProps) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {flags.map((flag, i) => {
        const config = {
          error: {
            cls: "bg-red-500/8 border-red-500/20 text-red-400",
            icon: <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />,
          },
          warning: {
            cls: "bg-amber-500/8 border-amber-500/20 text-amber-400",
            icon: (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            ),
          },
          info: {
            cls: "bg-blue-500/8 border-blue-500/20 text-blue-400",
            icon: <Info className="h-4 w-4 text-blue-400 shrink-0" />,
          },
        }[flag.severity];

        return (
          <div
            key={`${flag.type}-${i}`}
            className={`flex items-start gap-2 rounded-md border p-3 ${config.cls}`}
          >
            {config.icon}
            <p className="text-sm">{flag.message}</p>
          </div>
        );
      })}
    </div>
  );
}
