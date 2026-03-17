import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { draftOutcomePrompt } from "@/lib/ai/prompts";
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

  let body: { name?: string; outcome_type?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const context = await buildAIContext({ orgId });

    const result = await callAI<{
      outcome_statement: string;
      target_vertical: string;
      target_persona: string;
    }>({
      userPrompt: draftOutcomePrompt({
        name: body.name,
        outcome_type: body.outcome_type,
        org_context: context.org_context,
      }),
      requiredFields: ["outcome_statement", "target_vertical", "target_persona"],
      temperature: 0.7,
    });

    await incrementUsage("ai_generation");
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
