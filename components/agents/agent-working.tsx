import { AGENTS, type AgentId } from "@/lib/agents";

interface AgentWorkingProps {
  agentId: AgentId;
  subtitle?: string;
}

export function AgentWorking({ agentId, subtitle }: AgentWorkingProps) {
  const agent = AGENTS[agentId];
  if (!agent) return null;

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex items-center gap-1 mb-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: agent.color,
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-lg font-medium text-foreground">
        {agent.name} is working...
      </p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
