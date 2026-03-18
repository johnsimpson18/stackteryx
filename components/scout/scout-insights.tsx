"use client";

import Link from "next/link";
import { AgentBadge } from "@/components/agents/agent-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoutNudgeRecord } from "@/actions/scout-nudges";

function priorityColor(priority: number): string {
  if (priority <= 3) return "#e24b4a";
  if (priority <= 6) return "#ef9f27";
  return "#378add";
}

function priorityIcon(priority: number): string {
  if (priority <= 3) return "\u26A0"; // ⚠
  return "\uD83D\uDCA1"; // 💡
}

interface ScoutInsightsProps {
  nudges: ScoutNudgeRecord[];
}

export function ScoutInsights({ nudges }: ScoutInsightsProps) {
  if (nudges.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AgentBadge agentId="scout" size="sm" showTitle={false} />
          <CardTitle className="text-base">Scout Insights</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {nudges.map((nudge) => (
          <Link
            key={nudge.id}
            href={nudge.ctaHref ?? "#"}
            className="flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-2 -mx-2 transition-colors"
          >
            <span
              className="shrink-0 mt-0.5"
              style={{ fontSize: 12, color: priorityColor(nudge.priority) }}
            >
              {priorityIcon(nudge.priority)}
            </span>
            <span className="text-sm text-muted-foreground">
              {nudge.title}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
