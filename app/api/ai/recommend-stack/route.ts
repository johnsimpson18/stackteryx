import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { recommendStackPrompt } from "@/lib/ai/prompts";
import { getTools } from "@/lib/db/tools";
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

  let body: { available_tool_ids?: string[]; bundle_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const [context, allTools] = await Promise.all([
      buildAIContext({ orgId, bundleId: body.bundle_id }),
      getTools(orgId, { is_active: true }),
    ]);

    // Filter to available_tool_ids if provided, otherwise use all active tools
    const availableTools = body.available_tool_ids?.length
      ? allTools.filter((t) => body.available_tool_ids!.includes(t.id))
      : allTools;

    const toolCatalog = availableTools.map((t) => ({
      id: t.id,
      name: t.name,
      vendor: t.vendor,
      category: t.category,
      pricing_model: t.pricing_model,
      per_seat_cost: t.per_seat_cost,
      flat_monthly_cost: t.flat_monthly_cost,
    }));

    const result = await callAI<{ recommended_tool_ids: string[] }>({
      userPrompt: recommendStackPrompt({
        available_tools: toolCatalog,
        outcome_type: context.service_context?.outcome_type ?? undefined,
        outcome_statement:
          context.service_context?.outcome_statement ?? undefined,
        service_name: context.service_context?.bundle_name,
        org_context: context.org_context,
      }),
      requiredFields: ["recommended_tool_ids"],
      temperature: 0.4,
    });

    // Filter to only return IDs that actually exist in the catalog
    const validIds = new Set(availableTools.map((t) => t.id));
    result.recommended_tool_ids = result.recommended_tool_ids.filter((id) =>
      validIds.has(id)
    );

    await incrementUsage("ai_generation");
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
