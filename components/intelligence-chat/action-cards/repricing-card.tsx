"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AgentBadge } from "@/components/agents/agent-badge";
import { Loader2 } from "lucide-react";

interface RepricingData {
  serviceId: string;
  serviceName: string;
  currentMargin: number;
  suggestedPrice: number;
  targetMargin: number;
}

export function RepricingCard({ data }: { data: RepricingData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    startTransition(async () => {
      // Navigate to the service to apply pricing manually
      router.push(`/services/${data.serviceId}`);
    });
  }

  return (
    <div className="rounded-lg p-4 mt-2" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      <div className="flex items-center gap-2 mb-3">
        <AgentBadge agentId="margin" size="sm" showTitle={false} />
        <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Repricing suggestion
        </span>
      </div>

      <p className="text-sm font-bold text-foreground mb-2">{data.serviceName}</p>

      <div className="space-y-1 mb-3">
        <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Current margin: <span className="text-amber-400">{data.currentMargin}%</span>
        </p>
        <p className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Suggested: <span className="text-primary font-bold">${data.suggestedPrice}/seat</span> &rarr; {data.targetMargin}% margin
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Review in services
        </Button>
      </div>
    </div>
  );
}
