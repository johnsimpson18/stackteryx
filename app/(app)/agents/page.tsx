import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import { getActiveOrgId } from "@/lib/org-context";
import { getAgentActivities } from "@/lib/agents/log-activity";
import {
  Layers2,
  TrendingUp,
  BarChart2,
  Brain,
  FileText,
  Telescope,
} from "lucide-react";
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed";

const ICON_MAP: Record<string, typeof Layers2> = {
  Layers2,
  TrendingUp,
  BarChart2,
  Brain,
  FileText,
  Telescope,
};

const AGENT_LINKS: Record<string, { label: string; href: string }> = {
  aria: { label: "Open Stack Builder", href: "/stack-builder" },
  margin: { label: "View Services", href: "/services" },
  scout: { label: "Go to Dashboard", href: "/dashboard" },
  sage: { label: "Open Fractional CTO", href: "/cto-briefs" },
  pitch: { label: "Open Sales Studio", href: "/sales-studio" },
  horizon: { label: "View Dashboard", href: "/dashboard" },
};

export default async function AgentsPage() {
  const agents = Object.values(AGENTS);

  const orgId = await getActiveOrgId();
  let activities: Awaited<ReturnType<typeof getAgentActivities>> = [];
  if (orgId) {
    try {
      activities = await getAgentActivities(orgId, 50);
    } catch {
      // degrade gracefully
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your AI Team
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          These agents work continuously across your Stackteryx workspace —
          designing services, modeling economics, monitoring your portfolio, and
          preparing client materials.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = ICON_MAP[agent.icon] ?? Layers2;
          const link = AGENT_LINKS[agent.id];

          return (
            <div
              key={agent.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${agent.color}15` }}
                >
                  <Icon
                    className="h-4.5 w-4.5"
                    style={{ color: agent.color }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {agent.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{agent.title}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
              {link && (
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                  style={{ color: agent.color }}
                >
                  See {agent.name} in action &rarr;
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recent Agent Activity ──────────────────────────────────── */}
      <div
        className="rounded-xl"
        style={{
          background: "#111111",
          border: "1px solid #1e1e1e",
          padding: 20,
        }}
      >
        <h2
          className="text-sm font-semibold text-foreground mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Recent Agent Activity
        </h2>
        <AgentActivityFeed
          activities={activities}
          showAgentFilter
        />
      </div>
    </div>
  );
}
