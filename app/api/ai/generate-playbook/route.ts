import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { getBundleById } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import {
  getVersionsByBundleId,
  getVersionById,
} from "@/lib/db/bundle-versions";
import { upsertPlaybookContent } from "@/lib/db/enablement";
import { CATEGORY_LABELS } from "@/lib/constants";
import { validatePlaybookContext } from "@/lib/ai/validate-context";
import {
  LANGUAGE_SAFETY_RULES,
  COMPLIANCE_LANGUAGE_OVERRIDE,
  isComplianceFocused,
} from "@/lib/ai/language-rules";
import type { ToolCategory } from "@/lib/types";

export const maxDuration = 120;

interface PlaybookRequestBody {
  bundle_id: string;
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

  if (!body.bundle_id) {
    return Response.json({ error: "bundle_id is required" }, { status: 400 });
  }

  // ── 5. Fetch service data server-side ─────────────────────────────────
  const bundle = await getBundleById(body.bundle_id);
  if (!bundle || bundle.org_id !== orgId) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  const [outcome, versions] = await Promise.all([
    getServiceOutcome(body.bundle_id),
    getVersionsByBundleId(body.bundle_id),
  ]);

  const latestVersionId = versions.length > 0 ? versions[0].id : null;

  // Fetch tools from latest version
  let assignedTools: { name: string; vendor: string; domain: string }[] = [];
  if (latestVersionId) {
    const latestVersion = await getVersionById(latestVersionId);
    if (latestVersion?.tools) {
      assignedTools = latestVersion.tools
        .filter((vt) => vt.tool)
        .map((vt) => ({
          name: vt.tool!.name,
          vendor: vt.tool!.vendor,
          domain:
            CATEGORY_LABELS[vt.tool!.category as ToolCategory] ??
            vt.tool!.category,
        }));
    }
  }

  const serviceName = bundle.name;
  const outcomeType = outcome?.outcome_type ?? "";
  const outcomeStatement = outcome?.outcome_statement ?? "";
  const targetVertical = outcome?.target_vertical ?? "";
  const targetPersona = outcome?.target_persona ?? "";
  const serviceCapabilities = (outcome?.service_capabilities ?? []).map(
    (c) => ({ name: c.name, description: c.description })
  );

  // ── 5b. Validation gate ──────────────────────────────────────────────
  const validation = validatePlaybookContext({
    serviceName: serviceName,
    outcomeStatement: outcomeStatement,
    toolCount: assignedTools.length,
  });
  if (!validation.valid) {
    return Response.json(
      { error: "Insufficient context", missing: validation.missing },
      { status: 422 }
    );
  }

  // ── 6. Build prompts ──────────────────────────────────────────────────
  const toolsList = assignedTools
    .map((t) => `- ${t.name} (${t.vendor}) — ${t.domain}`)
    .join("\n");

  const capsList = serviceCapabilities
    .map((c) => `- ${c.name}: ${c.description}`)
    .join("\n");

  const verticalsList = (body.org_target_verticals ?? []).join(", ");
  const orgName = body.org_name || "";

  const systemPrompt = `You are a sales enablement strategist for managed security service providers (MSSPs). You produce sales playbooks that help MSP sales reps have credible, honest conversations with business buyers.

Your output must be grounded exclusively in the service data provided. You are not writing generic security marketing — you are writing specific, accurate content for a specific service with a defined outcome, named capabilities, and a real technology stack.

${LANGUAGE_SAFETY_RULES}

PLAYBOOK-SPECIFIC RULES:
- The ICP (ideal customer profile) must reflect the actual TARGET VERTICAL and TARGET PERSONA provided — do not substitute generic profiles
- Buying triggers must reflect realistic events that would make a business seek this specific type of service
- Objections must be real objections that buyers raise for this category of service — not generic "too expensive" responses
- The talk track must open with the OUTCOME STATEMENT as the anchor — lead with the business result, not the technology
- Email templates must be under 150 words each — business buyers do not read long emails
- The cheat sheet one-liner must be derived from the OUTCOME STATEMENT — it should sound like something a rep would actually say in an elevator
- stack_tools in the cheat_sheet must only list tool CATEGORIES (e.g. "Endpoint Detection", "SIEM") — never vendor names in customer-facing output

Output valid JSON only. No markdown fences, no commentary.`;

  let userPrompt = `Generate a complete sales playbook for the managed security service described below.

IMPORTANT: Every claim you make must be traceable to the data below. If a section of data is empty, omit references to it rather than inventing content.

---
SERVICE NAME: ${serviceName}
OUTCOME TYPE: ${outcomeType || "Not specified"}
OUTCOME STATEMENT: ${outcomeStatement || "NOT PROVIDED — do not invent an outcome statement"}
TARGET VERTICAL: ${targetVertical || "General"}
TARGET PERSONA: ${targetPersona || "IT Decision Maker / Business Owner"}
MSP NAME: ${orgName || "This MSP"}
MSP TARGET VERTICALS: ${verticalsList || "General"}

CAPABILITIES DELIVERED BY THIS SERVICE:
${capsList || "NOT PROVIDED — only reference capabilities if listed above"}

TECHNOLOGY STACK (internal only — never expose vendor names in customer-facing content):
${toolsList || "NOT PROVIDED — do not reference specific tools in customer-facing content"}
---

${outcomeStatement
    ? `The talk_track.opening_statement and cheat_sheet.one_liner must anchor to this outcome: "${outcomeStatement}"`
    : "No outcome statement is provided. Keep content high-level and do not fabricate a specific outcome."}

Return a JSON object with exactly these keys: icp, talk_track, objections (array of 4-6), emails (cold_outreach, follow_up, post_meeting), cheat_sheet.

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
    "opening_statement": "2-3 sentence opener anchored to the outcome statement",
    "problem_statement": "2-3 sentences describing the pain point",
    "solution_statement": "2-3 sentences positioning the service as the answer",
    "proof_points": ["string array of 3-4 concrete proof points grounded in the capabilities above"],
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
    "cold_outreach": { "subject": "string", "body": "string — under 150 words" },
    "follow_up": { "subject": "string", "body": "string — under 150 words" },
    "post_meeting": { "subject": "string", "body": "string — under 150 words" }
  },
  "cheat_sheet": {
    "one_liner": "single sentence elevator pitch derived from the outcome statement",
    "top_verticals": ["3-4 best-fit verticals"],
    "stack_tools": ["3-5 tool CATEGORY names only, never vendor names"],
    "top_triggers": ["3-4 buying triggers"],
    "differentiators": ["3-4 key differentiators"],
    "price_anchor": "string describing how to position pricing"
  }
}`;

  // Append compliance guardrail if service is compliance-focused
  if (isComplianceFocused(outcomeType, outcomeStatement)) {
    userPrompt += COMPLIANCE_LANGUAGE_OVERRIDE;
  }

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
