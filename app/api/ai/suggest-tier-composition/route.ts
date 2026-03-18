import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { checkLimit, incrementUsage } from "@/actions/billing";

export const maxDuration = 60;

interface SuggestTierRequest {
  org_id: string;
  services: {
    id: string;
    name: string;
    bundle_type: string;
    tool_count: number;
    mrr: number | null;
    outcome_type: string | null;
  }[];
  package_name: string;
}

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────
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

  // ── Parse body ──────────────────────────────────────────────────────────
  let body: SuggestTierRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.org_id !== orgId) {
    return Response.json({ error: "Org mismatch" }, { status: 403 });
  }

  // ── Build prompt ────────────────────────────────────────────────────────
  const servicesList = body.services
    .map(
      (s) =>
        `- ${s.name} (type: ${s.bundle_type}, tools: ${s.tool_count}, MRR: ${s.mrr != null ? `$${s.mrr}` : "N/A"}, outcome: ${s.outcome_type ?? "N/A"})`
    )
    .join("\n");

  const systemPrompt = `You are a pricing strategist for managed service providers (MSPs/MSSPs). You help package security services into good-better-best tiers. Output valid JSON only, no markdown fences, no commentary.`;

  const userPrompt = `Given the following active services, suggest how to arrange them into a tiered package called "${body.package_name}".

AVAILABLE SERVICES:
${servicesList}

Return a JSON object with this structure:
{
  "tiers": [
    {
      "tier_label": "string (e.g. Essential, Professional, Enterprise)",
      "service_id": "string (the id of the service to assign to this tier)",
      "service_name": "string",
      "rationale": "1-2 sentence explanation of why this service fits this tier"
    }
  ],
  "positioning_notes": "2-3 sentences about how to position this package to prospects",
  "pricing_guidance": "1-2 sentences about relative pricing between tiers"
}

Select 2-4 services that form a natural progression from basic to comprehensive. Order from lowest tier to highest. If fewer than 2 services are suitable, include all available.`;

  // ── Call AI ──────────────────────────────────────────────────────────────
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Clean and parse
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    await incrementUsage("ai_generation");
    try {
      const { logAgentActivity } = await import("@/lib/agents/log-activity");
      const actOrgId = await (await import("@/lib/org-context")).getActiveOrgId();
      if (actOrgId) {
        logAgentActivity({
          orgId: actOrgId,
          agentId: "margin",
          activityType: "analysis",
          title: "Margin analyzed tier composition",
          entityType: "service",
        });
      }
    } catch { /* never block */ }
    return Response.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
