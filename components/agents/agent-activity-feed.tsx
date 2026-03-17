"use client";

import { useState } from "react";
import Link from "next/link";
import { AGENTS } from "@/lib/agents";
import type { AgentActivityRecord } from "@/lib/agents/log-activity";

interface AgentActivityFeedProps {
  activities: AgentActivityRecord[];
  limit?: number;
  showAgentFilter?: boolean;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function entityHref(
  entityType: string | null,
  entityId: string | null,
): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "service":
      return `/services/${entityId}`;
    case "client":
      return `/clients/${entityId}`;
    case "proposal":
      return `/sales-studio?tab=history`;
    case "brief":
      return `/cto-briefs`;
    default:
      return null;
  }
}

const ENTITY_CTA: Record<string, string> = {
  service: "View service",
  client: "View client",
  proposal: "View proposal",
  brief: "View brief",
};

export function AgentActivityFeed({
  activities,
  limit,
  showAgentFilter = false,
}: AgentActivityFeedProps) {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter
    ? activities.filter((a) => a.agent_id === filter)
    : activities;
  const display = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div>
      {showAgentFilter && (
        <div className="flex items-center gap-1.5 mb-4">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="px-2.5 py-1 text-xs rounded-md transition-colors"
            style={{
              background: filter === null ? "#1e1e1e" : "transparent",
              color: filter === null ? "#ffffff" : "#666666",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            All
          </button>
          {Object.values(AGENTS).map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setFilter(agent.id)}
              className="px-2.5 py-1 text-xs rounded-md transition-colors flex items-center gap-1.5"
              style={{
                background: filter === agent.id ? "#1e1e1e" : "transparent",
                color: filter === agent.id ? agent.color : "#666666",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: agent.color }}
              />
              {agent.name}
            </button>
          ))}
        </div>
      )}

      {display.length === 0 ? (
        <p
          className="text-center py-8"
          style={{
            fontSize: 13,
            color: "#666666",
            fontFamily: "var(--font-mono-alt)",
          }}
        >
          No agent activity yet.
        </p>
      ) : (
        <div className="space-y-0.5">
          {display.map((activity) => {
            const agent = AGENTS[activity.agent_id];
            const href = entityHref(
              activity.entity_type,
              activity.entity_id,
            );
            const ctaLabel = activity.entity_type
              ? ENTITY_CTA[activity.entity_type] ?? "View"
              : null;

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 py-3 px-1"
                style={{ borderBottom: "1px solid #1a1a1a" }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0 mt-1.5"
                  style={{
                    backgroundColor: agent?.color ?? "#666666",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color: agent?.color ?? "#888888",
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      {agent?.name ?? activity.agent_id}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{
                        color: "#444444",
                        fontFamily: "var(--font-mono-alt)",
                      }}
                    >
                      {relativeTime(activity.created_at)}
                    </span>
                  </div>
                  <p
                    className="mt-0.5"
                    style={{
                      fontSize: 13,
                      color: "#cccccc",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {activity.title}
                  </p>
                </div>
                {href && ctaLabel && (
                  <Link
                    href={href}
                    className="shrink-0 text-xs rounded px-2 py-1 transition-colors whitespace-nowrap"
                    style={{
                      color: "#ffffff",
                      border: "1px solid #333333",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {ctaLabel} &rarr;
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
