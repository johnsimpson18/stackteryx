import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { matchServicesPrompt } from "@/lib/ai/prompts";
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
    prospect_industry?: string;
    prospect_size?: string;
    primary_concern?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const context = await buildAIContext({
      orgId,
      includePortfolio: true,
    });

    // Only match against active bundles
    const activeBundles =
      context.portfolio_context?.bundles.filter((b) => b.status === "active") ??
      [];

    if (activeBundles.length === 0) {
      return Response.json({ matched_services: [] });
    }

    const result = await callAI<{
      matched_services: Array<{
        bundle_id: string;
        service_name: string;
        match_reason: string;
      }>;
    }>({
      userPrompt: matchServicesPrompt({
        prospect_industry: body.prospect_industry,
        prospect_size: body.prospect_size,
        primary_concern: body.primary_concern,
        org_context: context.org_context,
        portfolio_context: {
          bundles: activeBundles,
        },
      }),
      requiredFields: ["matched_services"],
      temperature: 0.4,
    });

    // Validate that returned bundle_ids actually exist
    const validIds = new Set(activeBundles.map((b) => b.bundle_id));
    result.matched_services = result.matched_services.filter((m) =>
      validIds.has(m.bundle_id)
    );

    await incrementUsage("ai_generation");
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
