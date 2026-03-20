"use client";

import { AgentBadge } from "@/components/agents/agent-badge";
import type { OrchestrationPlan } from "@/lib/intelligence/agent-orchestrator";

interface OrchestrationDisplayProps {
  plan: OrchestrationPlan;
}

export function OrchestrationDisplay({ plan }: OrchestrationDisplayProps) {
  return (
    <div
      className="rounded-lg p-4 mt-2 space-y-3"
      style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
    >
      <p
        className="text-xs font-semibold text-foreground"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        Coordinating your agents...
      </p>

      <div className="space-y-2">
        {plan.agents.map((agent) => (
          <div key={agent.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AgentBadge
                agentId={agent.agentId}
                size="sm"
                showTitle={false}
              />
              <span
                className="text-xs text-muted-foreground"
                style={{ fontFamily: "var(--font-mono-alt)" }}
              >
                {agent.task}
              </span>
            </div>
            <span className="text-xs" style={{ fontFamily: "var(--font-mono-alt)" }}>
              {agent.status === "done" ? (
                <span style={{ color: "#5DCAA5" }}>&#10003;</span>
              ) : agent.status === "error" ? (
                <span style={{ color: "#e24b4a" }}>&#10007;</span>
              ) : (
                <span className="inline-flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                  <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }} />
                  <span className="h-1 w-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <p
        className="text-[10px] text-muted-foreground/60"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        {plan.estimatedTime}
      </p>
    </div>
  );
}
