import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { analyzeMarginImpactPrompt } from "@/lib/ai/prompts";

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

  let body: {
    change_description: string;
    affected_services: Array<{
      bundle_id: string;
      service_name: string;
      current_margin_pct: number;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.change_description) {
    return Response.json(
      { error: "change_description is required" },
      { status: 400 }
    );
  }

  try {
    const context = await buildAIContext({ orgId });

    const result = await callAI<{ impact_summary: string }>({
      userPrompt: analyzeMarginImpactPrompt({
        change_description: body.change_description,
        affected_services: body.affected_services ?? [],
        org_context: context.org_context,
      }),
      requiredFields: ["impact_summary"],
      temperature: 0.4,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
