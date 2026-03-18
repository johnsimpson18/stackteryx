"use server";

import { getAnthropicClient } from "@/lib/ai/client";
import { stripCodeFences } from "@/lib/ai/validate";
import { createServiceClient } from "@/lib/supabase/service";
import { getActiveOrgId } from "@/lib/org-context";
import type { HorizonDigest } from "@/types/horizon";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  return `Week of ${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
}

function weekStartISO(date: Date = new Date()): string {
  return getWeekStart(date).toISOString().split("T")[0];
}

// ── Web Search Phase ─────────────────────────────────────────────────────────

async function runWebSearch(query: string): Promise<string> {
  const client = getAnthropicClient();

  try {
    // Race against a 30s timeout per search
    const result = await Promise.race([
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [
          {
            type: "web_search_20250305" as "web_search_20250305",
            name: "web_search",
          },
        ],
        messages: [
          {
            role: "user",
            content: `Search for current MSP industry trends.\nSearch query: "${query}"\nExtract the 3 most relevant findings for a managed service provider.\nFocus on: technology shifts, business model changes, competitive dynamics.\nBe specific and cite what you find.`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), 30000),
      ),
    ]);

    return result.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n\n");
  } catch {
    return `[Search failed for: ${query}]`;
  }
}

// ── Digest Generation ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Horizon, a market intelligence agent for Stackteryx — a platform that helps MSPs design, price, and sell managed services.

Your job is to produce a weekly market intelligence digest for MSP owners. The MSP runs a managed services practice delivering cybersecurity, backup, compliance, and advisory services.

You have access to recent web search results AND your own knowledge of the MSP industry.

DIGEST REQUIREMENTS:
- technologyShifts: 3 items about emerging tools, platform changes, AI developments affecting MSP service delivery
- mspBusinessTrends: 3 items about pricing benchmarks, buyer behavior, service packaging shifts, market sizing
- competitiveIntelligence: 2 items about how the MSP market is evolving, what leading MSPs are doing differently

RULES:
- Every item must be specific and actionable — no vague "AI is growing" statements
- Impact = high if the MSP should act within 90 days
- Impact = medium if relevant for 6-month planning
- Impact = low if good background knowledge
- Write for an MSP owner, not a technologist — business outcomes first
- Be opinionated — tell them what matters and why
- Each item needs a unique id (use format like "ts-1", "bt-1", "ci-1")
- Return ONLY valid JSON matching the HorizonDigest schema. No markdown, no code fences, no commentary.`;

export async function generateHorizonDigest(
  orgId: string,
): Promise<HorizonDigest> {
  const ws = getWeekStart();
  const weekLabel = formatWeekLabel(ws);
  const weekStart = weekStartISO();

  // Phase 1 — Web search (3 queries)
  const searchQueries = [
    "MSP managed services technology trends 2026",
    "cybersecurity MSP market shifts AI automation 2026",
    "managed service provider pricing packaging competitive landscape",
  ];

  let usedQueries = [...searchQueries];

  // Run all searches in parallel for speed
  const searchResults = await Promise.all(
    searchQueries.map((query) => runWebSearch(query)),
  );

  const allSearchesFailed = searchResults.every((r) =>
    r.startsWith("[Search failed"),
  );
  if (allSearchesFailed) {
    usedQueries = ["fallback - knowledge base only"];
  }

  const researchContext = searchResults.join("\n\n---\n\n");

  // Phase 2 — Structured digest generation
  const client = getAnthropicClient();
  const today = new Date().toISOString().split("T")[0];

  const userMessage = `Today's date: ${today}
Week: ${weekLabel}

Recent research findings:
${researchContext}

Generate this week's Horizon market intelligence digest for MSP owners.

Return a JSON object with this exact shape:
{
  "weekLabel": "${weekLabel}",
  "weekStart": "${weekStart}",
  "generatedAt": "${new Date().toISOString()}",
  "technologyShifts": [{ "id": "ts-1", "title": "...", "summary": "...", "impact": "high|medium|low", "impactLabel": "...", "actionable": true/false, "action": "...", "source": "...", "tags": [...] }, ...],
  "mspBusinessTrends": [{ "id": "bt-1", ... }, ...],
  "competitiveIntelligence": [{ "id": "ci-1", ... }, ...],
  "searchQueriesUsed": ${JSON.stringify(usedQueries)},
  "modelKnowledgeDate": "May 2025"
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.5,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let digest: HorizonDigest;
  try {
    digest = JSON.parse(stripCodeFences(text));
  } catch {
    // Retry with simpler prompt
    const retryResponse = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: text },
        {
          role: "user",
          content:
            "Your response was not valid JSON. Return ONLY the JSON object, no markdown or commentary.",
        },
      ],
    });

    const retryText =
      retryResponse.content[0].type === "text"
        ? retryResponse.content[0].text
        : "";
    digest = JSON.parse(stripCodeFences(retryText));
  }

  // Save to database
  const service = createServiceClient();

  await service.from("horizon_digests").upsert(
    {
      org_id: orgId,
      week_label: weekLabel,
      week_start: weekStart,
      status: "published",
      digest_json: digest,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,week_start" },
  );

  // Log Horizon activity (fire-and-forget)
  import("@/lib/agents/log-activity").then(({ logAgentActivity }) => {
    logAgentActivity({
      orgId,
      agentId: "horizon",
      activityType: "generation",
      title: `Horizon published market intelligence digest for ${weekLabel}`,
    });
  });

  return digest;
}

export async function getLatestHorizonDigest(): Promise<{
  id: string;
  digest: HorizonDigest;
} | null> {
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("horizon_digests")
    .select("id, digest_json")
    .eq("org_id", orgId)
    .eq("status", "published")
    .order("week_start", { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;
  return { id: data.id, digest: data.digest_json as unknown as HorizonDigest };
}

export async function markDigestViewed(digestId: string): Promise<void> {
  const orgId = await getActiveOrgId();
  if (!orgId) return;

  const service = createServiceClient();
  await service
    .from("horizon_digests")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", digestId)
    .eq("org_id", orgId);
}
