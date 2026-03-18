"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "./breadcrumbs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchOrgAction } from "@/actions/orgs";
import { ChevronsUpDown } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { AgentActivityFeed } from "@/components/agents/agent-activity-feed";
import type { AgentActivityRecord } from "@/lib/agents/log-activity";

interface TopbarProps {
  workspaceName: string;
  activeOrgId?: string;
  userOrgs?: { org_id: string; org_name: string }[];
  recentActivities?: AgentActivityRecord[];
  highPriorityNudgeCount?: number;
}

const AGENT_DOTS = Object.values(AGENTS);
const AGENT_PULSE_DELAYS = ["0s", "0.6s", "1.2s", "1.8s", "2.4s"];

export function Topbar({
  workspaceName,
  activeOrgId,
  userOrgs = [],
  recentActivities = [],
  highPriorityNudgeCount = 0,
}: TopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pulseOpen, setPulseOpen] = useState(false);
  const hasMultipleOrgs = userOrgs.length > 1;

  function handleOrgSwitch(orgId: string) {
    if (orgId === activeOrgId) return;
    startTransition(async () => {
      await switchOrgAction(orgId);
      router.refresh();
    });
  }

  return (
    <header className="relative flex h-12 items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-md flex-shrink-0">
      {/* Subtle bottom glow line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <Breadcrumbs />
      <div className="flex items-center gap-3">
        {/* Agent pulse indicator */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPulseOpen(!pulseOpen)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-white/[0.04]"
          >
            <span className="flex items-center gap-0.5">
              {AGENT_DOTS.map((agent, i) => (
                <span
                  key={agent.id}
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor: agent.color,
                    animationDuration: "3s",
                    animationDelay: AGENT_PULSE_DELAYS[i % AGENT_PULSE_DELAYS.length],
                  }}
                />
              ))}
            </span>
            <span
              className="text-[10px] hidden sm:inline"
              style={{
                color: "#555555",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              5 agents active
            </span>
            {highPriorityNudgeCount > 0 && (
              <span
                className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: "#e24b4a" }}
              >
                {highPriorityNudgeCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {pulseOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setPulseOpen(false)}
              />
              <div
                className="absolute right-0 top-full mt-1.5 z-50 w-80 rounded-lg shadow-lg"
                style={{
                  background: "#111111",
                  border: "1px solid #1e1e1e",
                  padding: 12,
                }}
              >
                <AgentActivityFeed
                  activities={recentActivities}
                  limit={3}
                />
                <Link
                  href="/agents"
                  className="block text-center mt-2 pt-2 text-xs transition-colors"
                  style={{
                    color: "#c8f135",
                    fontFamily: "var(--font-mono-alt)",
                    borderTop: "1px solid #1e1e1e",
                  }}
                  onClick={() => setPulseOpen(false)}
                >
                  View all activity &rarr;
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Org indicator */}
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#A8FF3E] shadow-[0_0_6px_2px_rgba(168,255,62,0.4)]" />
          {hasMultipleOrgs ? (
            <Select
              value={activeOrgId}
              onValueChange={handleOrgSwitch}
              disabled={isPending}
            >
              <SelectTrigger className="h-7 border-0 bg-transparent text-xs text-muted-foreground font-medium shadow-none hover:text-foreground transition-colors gap-1 px-1.5 min-w-0">
                <SelectValue />
                <ChevronsUpDown className="h-3 w-3 opacity-50" />
              </SelectTrigger>
              <SelectContent align="end">
                {userOrgs.map((org) => (
                  <SelectItem key={org.org_id} value={org.org_id}>
                    {org.org_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs text-muted-foreground font-medium">
              {workspaceName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
