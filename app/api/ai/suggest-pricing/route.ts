import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { suggestPricingPrompt } from "@/lib/ai/prompts";
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

  let body: { bundle_id: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.bundle_id) {
    return Response.json({ error: "bundle_id is required" }, { status: 400 });
  }

  try {
    const context = await buildAIContext({
      orgId,
      bundleId: body.bundle_id,
    });

    if (!context.service_context) {
      return Response.json({ error: "Bundle not found" }, { status: 404 });
    }

    const result = await callAI<{
      suggested_price: number;
      margin_pct: number;
      billing_unit: string;
      cost_floor: number;
      pricing_rationale: string;
    }>({
      userPrompt: suggestPricingPrompt({
        service_context: context.service_context,
        org_context: context.org_context,
      }),
      requiredFields: [
        "suggested_price",
        "margin_pct",
        "billing_unit",
        "cost_floor",
        "pricing_rationale",
      ],
      temperature: 0.4,
    });

    await incrementUsage("ai_generation");
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
