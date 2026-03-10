import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getTools } from "@/lib/db/tools";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { recommendRequestSchema } from "@/lib/schemas/recommend";

export const maxDuration = 60;

// ── Rate limiting (in-memory, resets on restart) ──────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior MSP security architect helping design security bundles for managed service providers. You have deep expertise in security tool stacking, MSP economics, and compliance frameworks.

Given a client profile and a catalog of available security tools, recommend exactly 3 bundle options:

1. **Essential** — The minimum viable security stack. Prioritize cost-efficiency while covering core attack vectors. Target the lowest reasonable price point.
2. **Recommended** — The balanced stack most MSPs should sell. Good coverage, reasonable margin, covers compliance needs. This is your primary recommendation.
3. **Premium** — The comprehensive stack for security-conscious clients. Maximum coverage, higher margin opportunity, includes advanced tools.

For each bundle, respond with this exact JSON structure (no markdown, no code fences, just raw JSON):

{
  "recommendations": [
    {
      "tier": "essential",
      "name": "Short bundle name (3-5 words)",
      "description": "One paragraph explaining the strategy and why these tools work together",
      "toolIds": ["tool_id_1", "tool_id_2"],
      "reasoning": {
        "whyTheseTools": "Explain the tool selection logic",
        "coverageGaps": "What is NOT covered and why that's acceptable at this tier",
        "complianceNotes": "How this addresses the compliance requirements (if any)",
        "sellingPoints": ["Point 1", "Point 2", "Point 3"]
      },
      "suggestedSettings": {
        "targetMarginPct": 0.30,
        "overheadPct": 0.10,
        "laborPct": 0.15,
        "contractTermMonths": 12,
        "riskTier": "high",
        "discountPct": 0.0
      }
    }
  ]
}

Rules:
- Only use tools from the provided catalog. Reference them by their exact id field.
- For the Essential tier, target margin around 25-30%. For Recommended, 30-35%. For Premium, 35-40%.
- If the client has compliance requirements (HIPAA, PCI-DSS, etc.), ensure the Recommended and Premium tiers include tools that address those.
- If a budget cap is provided, ensure at least the Essential tier fits within it. Note if Recommended/Premium exceed it.
- Adjust overhead estimates based on tool complexity — more complex stacks need higher overhead.
- Set riskTier based on the coverage level: Essential=high (more exposure), Recommended=medium, Premium=low.
- Do NOT include pricing calculations — just select tools and settings. Pricing is computed separately.
- Return all 3 tiers in the recommendations array in order: essential, recommended, premium.`;

export async function POST(request: Request) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Org membership + RBAC ─────────────────────────────────────────────
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getOrgMembership(orgId);
  if (!membership) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (membership.role === "viewer") {
    return Response.json(
      { error: "Viewers cannot generate recommendations." },
      { status: 403 }
    );
  }

  // ── 3. API key check ──────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  // ── 4. Rate limiting ──────────────────────────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return Response.json(
      { error: "Rate limit exceeded. Max 5 recommendations per hour." },
      { status: 429 }
    );
  }

  // ── 5. Parse & validate body ──────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = recommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    );
  }

  const clientProfile = parsed.data;

  // ── 6. Fetch tools + settings ─────────────────────────────────────────────
  const [tools, settings] = await Promise.all([
    getTools(orgId, { is_active: true }),
    getOrgSettings(orgId),
  ]);

  if (tools.length === 0) {
    return Response.json(
      { error: "No active tools in catalog. Add tools before generating recommendations." },
      { status: 422 }
    );
  }

  // Build slim tool catalog for the prompt (exclude noisy fields)
  const toolCatalog = tools.map((t) => ({
    id: t.id,
    name: t.name,
    vendor: t.vendor,
    category: t.category,
    pricing_model: t.pricing_model,
    per_seat_cost: t.per_seat_cost,
    flat_monthly_cost: t.flat_monthly_cost,
    tier_rules: t.tier_rules ?? [],
    vendor_minimum_monthly: t.vendor_minimum_monthly,
    labor_cost_per_seat: t.labor_cost_per_seat,
    support_complexity: t.support_complexity,
  }));

  // ── 7. Build user prompt ──────────────────────────────────────────────────
  const defaultMargin = settings?.default_target_margin_pct ?? 0.35;
  const complianceList =
    clientProfile.complianceRequirements.length > 0 &&
    !clientProfile.complianceRequirements.includes("none")
      ? clientProfile.complianceRequirements.map((c) => c.toUpperCase()).join(", ")
      : "None";

  const userPrompt = `Client Profile:
- Name: ${clientProfile.clientName}
- Industry: ${clientProfile.industry}
- Seat Count: ${clientProfile.seatCount}
- Risk Tolerance: ${clientProfile.riskTolerance}
- Budget Cap Per Seat: ${clientProfile.budgetPerSeatMax ? `$${clientProfile.budgetPerSeatMax}/seat/month` : "No cap specified"}
- Compliance Requirements: ${complianceList}
- Current Pain Points: ${clientProfile.currentPainPoints ?? "Not specified"}
- Additional Notes: ${clientProfile.notes ?? "None"}

Workspace Default Margin Target: ${Math.round(defaultMargin * 100)}%

Available Tool Catalog (${toolCatalog.length} tools):
${JSON.stringify(toolCatalog, null, 2)}`;

  // ── 8. Stream from Anthropic ──────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        // ── 9. Log recommendation to history (fire-and-forget) ────────────
        void supabase
          .from("recommendation_history")
          .insert({
            user_id: user.id,
            org_id: orgId,
            client_name: clientProfile.clientName,
            industry: clientProfile.industry,
            seat_count: clientProfile.seatCount,
            risk_tolerance: clientProfile.riskTolerance,
            compliance_requirements: clientProfile.complianceRequirements,
            recommendations: (() => {
              try {
                return JSON.parse(fullText);
              } catch {
                return null;
              }
            })(),
          });

        // Audit log (fire-and-forget)
        void supabase
          .from("audit_log")
          .insert({
            user_id: user.id,
            org_id: orgId,
            action: "recommendation_generated",
            entity_type: "recommendation",
            entity_id: null,
            metadata: {
              client_name: clientProfile.clientName,
              industry: clientProfile.industry,
              seat_count: clientProfile.seatCount,
            },
          });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
