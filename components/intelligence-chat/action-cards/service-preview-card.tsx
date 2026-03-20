"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AgentBadge } from "@/components/agents/agent-badge";
import { Loader2 } from "lucide-react";
import { saveStackAsService } from "@/actions/stack-builder";

interface ServicePreviewData {
  name: string;
  tools: { id: string; name: string; category: string; costPerSeat: number }[];
  suggestedPrice: number;
  margin: number;
  complianceScores: { hipaa: number; pci: number; cmmc: number };
  outcomes: string[];
}

export function ServicePreviewCard({ data }: { data: ServicePreviewData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveStackAsService({
        serviceName: data.name,
        toolIds: data.tools.map((t) => t.id),
        seatCount: 50,
      });
      if (result.success) {
        // Cascading effects (fire-and-forget)
        import("@/actions/compliance-coverage").then(({ recalculateOrgCompliance }) => {
          recalculateOrgCompliance().catch(() => {});
        });
        import("@/actions/client-health").then(({ recalculateAllHealthScores }) => {
          recalculateAllHealthScores().catch(() => {});
        });

        // Emit artifact event for cross-module visibility
        window.dispatchEvent(
          new CustomEvent("stackteryx:artifact-created", {
            detail: { type: "service", id: result.data?.bundleId },
          }),
        );

        router.push(`/services/${result.data?.bundleId}`);
      }
    });
  }

  return (
    <div className="rounded-lg p-4 mt-2" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      <div className="flex items-center gap-2 mb-3">
        <AgentBadge agentId="aria" size="sm" showTitle={false} />
        <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Service preview
        </span>
      </div>

      <p className="text-sm font-bold text-foreground mb-2">{data.name}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {data.tools.map((t) => (
          <span key={t.id} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {t.name}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Margin</p>
          <p className="text-xs font-mono font-bold text-foreground">{data.margin}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Price/seat</p>
          <p className="text-xs font-mono font-bold text-primary">${data.suggestedPrice}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">HIPAA</p>
          <p className="text-xs font-mono font-bold text-foreground">{data.complianceScores.hipaa}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">CMMC</p>
          <p className="text-xs font-mono font-bold text-foreground">{data.complianceScores.cmmc}%</p>
        </div>
      </div>

      {data.outcomes.length > 0 && (
        <div className="mb-3 space-y-1">
          {data.outcomes.slice(0, 3).map((o, i) => (
            <p key={i} className="text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
              &#10003; {o}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Save as Service
        </Button>
        <Button size="sm" variant="outline" onClick={() => router.push("/stack-builder")}>
          Open in Stack Builder
        </Button>
      </div>
    </div>
  );
}
