import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { recommendCapabilitiesPrompt } from "@/lib/ai/prompts";
import { checkLimit, incrementUsage } from "@/actions/billing";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId();
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgMembership(orgId);
  if (!membership)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const aiLimit = await checkLimit("aiGenerationsPerMonth");
  if (!aiLimit.allowed) {
    return Response.json({ error: "LIMIT_REACHED" }, { status: 403 });
  }

  let body: {
    bundle_type?: string;
    bundle_id?: string;
    outcome_type?: string;
    outcome_statement?: string;
    service_name?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine — all fields are optional
  }

  try {
    const context = await buildAIContext({
      orgId,
      bundleId: body.bundle_id,
    });

    const result = await callAI<{
      capabilities: Array<{ name: string; description: string }>;
    }>({
      userPrompt: recommendCapabilitiesPrompt({
        bundle_type: body.bundle_type ?? context.service_context?.bundle_type,
        outcome_type:
          body.outcome_type ?? context.service_context?.outcome_type ?? undefined,
        outcome_statement:
          body.outcome_statement ??
          context.service_context?.outcome_statement ??
          undefined,
        service_name:
          body.service_name ?? context.service_context?.bundle_name,
        org_context: context.org_context,
      }),
      requiredFields: ["capabilities"],
      temperature: 0.4,
    });

    await incrementUsage("ai_generation");
    try {
      const { logAgentActivity } = await import("@/lib/agents/log-activity");
      const actOrgId = await (await import("@/lib/org-context")).getActiveOrgId();
      if (actOrgId) {
        logAgentActivity({
          orgId: actOrgId,
          agentId: "aria",
          activityType: "analysis",
          title: "Aria suggested service capabilities",
          entityType: "service",
        });
      }
    } catch { /* never block */ }
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
