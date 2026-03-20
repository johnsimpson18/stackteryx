export interface OrchestrationPlan {
  agents: AgentTask[];
  deliverable: string;
  estimatedTime: string;
}

export interface AgentTask {
  id: string;
  agentId: "aria" | "margin" | "scout" | "sage" | "pitch" | "horizon";
  task: string;
  status: "pending" | "working" | "done" | "error";
  result?: string;
}

export interface OrchestrationResult {
  plan: OrchestrationPlan;
  results: Record<string, string>;
}
