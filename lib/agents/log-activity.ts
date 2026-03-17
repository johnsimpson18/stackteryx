import { createServiceClient } from "@/lib/supabase/service";

export interface AgentActivityInput {
  orgId: string;
  agentId: "aria" | "margin" | "scout" | "sage" | "pitch";
  activityType: "analysis" | "generation" | "detection" | "alert";
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentActivityRecord {
  id: string;
  org_id: string;
  agent_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Log agent activity. Fire-and-forget — never blocks the caller.
 */
export function logAgentActivity(input: AgentActivityInput): void {
  // Fire and forget — do not await
  _writeActivity(input).catch(() => {
    // Silently ignore logging failures
  });
}

async function _writeActivity(input: AgentActivityInput): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("agent_activity_log").insert({
    org_id: input.orgId,
    agent_id: input.agentId,
    activity_type: input.activityType,
    title: input.title,
    description: input.description ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    entity_name: input.entityName ?? null,
    metadata: input.metadata ?? {},
  });
}

/**
 * Fetch recent agent activities for an org.
 */
export async function getAgentActivities(
  orgId: string,
  limit = 50,
): Promise<AgentActivityRecord[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_activity_log")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AgentActivityRecord[];
}
