import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { generateEnablementPrompt } from "@/lib/ai/prompts";

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

  let body: { bundle_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine
  }

  try {
    const context = await buildAIContext({
      orgId,
      bundleId: body.bundle_id,
    });

    const result = await callAI<{
      service_overview: string;
      whats_included: string;
      talking_points: string;
      pricing_narrative: string;
      why_us: string;
      elevator_pitch?: string;
      value_proposition?: string;
      objection_responses?: Array<{ objection: string; response: string }>;
      discovery_questions?: string[];
    }>({
      userPrompt: generateEnablementPrompt({
        service_context: context.service_context ?? {},
        org_context: context.org_context,
      }),
      requiredFields: [
        "service_overview",
        "whats_included",
        "talking_points",
        "pricing_narrative",
        "why_us",
      ],
      temperature: 0.7,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
