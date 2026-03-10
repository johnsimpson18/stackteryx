import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { upsertPlaybookContent } from "@/lib/db/enablement";

export const maxDuration = 120;

interface PlaybookRequestBody {
  org_id: string;
  bundle_id: string;
  service_name: string;
  outcome_type: string;
  outcome_statement: string;
  target_vertical: string;
  target_persona: string;
  service_capabilities: { name: string; description: string }[];
  assigned_tools: { name: string; vendor: string; domain: string }[];
  org_name: string;
  org_target_verticals: string[];
}

export async function POST(request: Request) {
  // ── 1. Auth: Supabase user check ──────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ── 2. Org context ────────────────────────────────────────────────────
  const orgId = await getActiveOrgId();
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ── 3. Membership check ───────────────────────────────────────────────
  const membership = await getOrgMembership(orgId);
  if (!membership)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  // ── 4. Parse request body ─────────────────────────────────────────────
  let body: PlaybookRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 5. Resolve latest version for persistence ─────────────────────────
  const versions = await getVersionsByBundleId(body.bundle_id);
  const latestVersionId = versions.length > 0 ? versions[0].id : null;

  // ── 7. Build prompts ──────────────────────────────────────────────────
  const toolsList = body.assigned_tools
    .map((t) => `- ${t.name} (${t.vendor}) — ${t.domain}`)
    .join("\n");

  const capsList = body.service_capabilities
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

  const verticalsList = body.org_target_verticals.join(", ");

  const systemPrompt = `You are a sales enablement strategist for managed service providers (MSPs). You produce vendor-agnostic, outcome-focused sales playbooks. Never mention specific vendor product names in customer-facing language — refer to capabilities and outcomes instead. Output valid JSON only, no markdown fences, no commentary.`;

  const userPrompt = `Generate a complete sales playbook for the service described below.

SERVICE: ${body.service_name}
OUTCOME TYPE: ${body.outcome_type}
OUTCOME STATEMENT: ${body.outcome_statement}
TARGET VERTICAL: ${body.target_vertical || "General"}
TARGET PERSONA: ${body.target_persona || "IT Decision Maker"}
MSP NAME: ${body.org_name}
MSP TARGET VERTICALS: ${verticalsList || "General"}

CAPABILITIES:
${capsList || "None specified"}

TECHNOLOGY STACK (internal only — do not expose vendor names to prospects):
${toolsList || "None specified"}

Return a JSON object with exactly these top-level keys in this order:

{
  "icp": {
    "industries": ["string array of 4-6 target industries"],
    "company_size": "string describing ideal company size range",
    "buyer_role": "string describing the primary buyer role/title",
    "security_maturity": "string describing the ideal security maturity level",
    "buying_triggers": ["string array of 4-6 events that trigger buying"],
    "qualification_questions": ["string array of 5-7 discovery questions"]
  },
  "talk_track": {
    "opening_statement": "2-3 sentence opener that establishes credibility",
    "problem_statement": "2-3 sentences describing the pain point",
    "solution_statement": "2-3 sentences positioning the service as the answer",
    "proof_points": ["string array of 3-4 concrete proof points or statistics"],
    "closing_question": "single question to advance the conversation"
  },
  "objections": [
    {
      "objection": "the objection text",
      "acknowledgment": "empathetic acknowledgment",
      "response": "2-3 sentence reframe",
      "follow_up_question": "question to regain momentum"
    }
  ],
  "emails": {
    "cold_outreach": { "subject": "string", "body": "string" },
    "follow_up": { "subject": "string", "body": "string" },
    "post_meeting": { "subject": "string", "body": "string" }
  },
  "cheat_sheet": {
    "one_liner": "single sentence elevator pitch",
    "top_verticals": ["3-4 best-fit verticals"],
    "stack_tools": ["3-5 internal tool category names for quick reference"],
    "top_triggers": ["3-4 buying triggers"],
    "differentiators": ["3-4 key differentiators"],
    "price_anchor": "string describing how to position pricing"
  }
}

Generate 4-6 objections. Emails should be professional, concise, and under 200 words each. All language must be vendor-agnostic in customer-facing sections.`;

  // ── 8. Stream from Anthropic ──────────────────────────────────────────
  try {
    const client = getAnthropicClient();

    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Capture userId and orgId for persistence closure
    const userId = user.id;

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullBuffer = "";

        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullBuffer += event.delta.text;
              const chunk = `data: ${JSON.stringify(event.delta.text)}\n\n`;
              controller.enqueue(encoder.encode(chunk));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // ── Persist playbook after stream completes ──────────────────
          if (latestVersionId && fullBuffer.length > 0) {
            try {
              const cleaned = fullBuffer
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```\s*$/, "")
                .trim();
              const parsed = JSON.parse(cleaned);
              if (parsed && typeof parsed === "object") {
                await upsertPlaybookContent(
                  orgId,
                  userId,
                  latestVersionId,
                  parsed as Record<string, unknown>
                );
              }
            } catch {
              // Parsing or DB write failed — non-fatal, stream already sent
              console.error("Failed to persist playbook content");
            }
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Stream failed";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
