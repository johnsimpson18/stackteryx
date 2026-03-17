import { AGENTS, type AgentId } from "@/lib/agents";

interface AgentBadgeProps {
  agentId: AgentId;
  size?: "sm" | "md";
  showTitle?: boolean;
}

export function AgentBadge({
  agentId,
  size = "sm",
  showTitle = true,
}: AgentBadgeProps) {
  const agent = AGENTS[agentId];
  if (!agent) return null;

  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const nameSize = size === "sm" ? "text-xs" : "text-sm";
  const titleSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`${dotSize} rounded-full shrink-0`}
        style={{ backgroundColor: agent.color }}
      />
      <span className={`${nameSize} font-semibold text-foreground`}>
        {agent.name}
      </span>
      {showTitle && (
        <span className={`${titleSize} text-muted-foreground`}>
          {agent.title}
        </span>
      )}
    </span>
  );
}
