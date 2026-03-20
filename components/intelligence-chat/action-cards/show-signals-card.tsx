"use client";

import Link from "next/link";
import { AgentBadge } from "@/components/agents/agent-badge";

interface SignalItem {
  title: string;
  clientName?: string;
  cta?: string;
}

export function ShowSignalsCard({ data }: { data: { signals: SignalItem[] } }) {
  return (
    <div className="rounded-lg p-3 mt-2 space-y-2" style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}>
      <div className="flex items-center gap-2">
        <AgentBadge agentId="scout" size="sm" showTitle={false} />
        <span className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Active signals
        </span>
      </div>
      {data.signals.map((signal, i) => (
        <div key={i} className="flex items-start justify-between gap-2 py-1.5" style={{ borderTop: i > 0 ? "1px solid #1a1a1a" : undefined }}>
          <p className="text-xs text-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
            {signal.title}
          </p>
          {signal.cta && (
            <Link
              href={signal.cta}
              className="text-[10px] text-primary shrink-0 hover:underline"
              style={{ fontFamily: "var(--font-mono-alt)" }}
            >
              View &rarr;
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
