import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { checkLimit, incrementUsage } from "@/actions/billing";

export const maxDuration = 60;

interface SummaryRequestBody {
  client_name: string;
  framework_name: string;
  score_pct: number;
  controls_satisfied: number;
  controls_partial: number;
  controls_gap: number;
  controls_manual: number;
  domain_scores: { domain: string; scorePct: number }[];
  top_gaps: { id: string; name: string; missingDomains: string[] }[];
}

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────
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

  // ── Parse body ───────────────────────────────────────────────────────
  let body: SummaryRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Build prompt ─────────────────────────────────────────────────────
  const domainLines = body.domain_scores
    .map((d) => `- ${d.domain}: ${d.scorePct}%`)
    .join("\n");

  const gapLines = body.top_gaps
    .map(
      (g) =>
        `- ${g.id} (${g.name}): missing ${g.missingDomains.join(", ")}`
    )
    .join("\n");

  const systemPrompt =
    "You are a cybersecurity compliance advisor writing executive summaries for managed service providers. Write clear, professional prose. Do not use markdown formatting. Keep it concise — 3-4 paragraphs maximum.";

  const userPrompt = `Write a brief executive summary for a compliance assessment report.

CLIENT: ${body.client_name}
FRAMEWORK: ${body.framework_name}
OVERALL SCORE: ${body.score_pct}%
CONTROLS: ${body.controls_satisfied} satisfied, ${body.controls_partial} partial, ${body.controls_gap} gaps, ${body.controls_manual} manual/excluded

DOMAIN SCORES:
${domainLines}

TOP GAPS:
${gapLines || "None"}

The summary should:
1. State the overall compliance posture (strong/moderate/needs improvement)
2. Highlight the strongest and weakest domains
3. Briefly note the most critical gaps
4. Recommend next steps for remediation
5. Note that manual/administrative controls require separate validation`;

  // ── Call Anthropic ──────────────────────────────────────────────────
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      temperature: 0.5,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    await incrementUsage("ai_generation");
    return Response.json({ summary: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
