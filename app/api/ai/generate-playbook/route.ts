import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { getBundleById } from "@/lib/db/bundles";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { upsertPlaybookContent } from "@/lib/db/enablement";
import { buildSalesStudioContext } from "@/lib/ai/sales-studio-context";
import {
  buildPlaybookPrompt,
  PLAYBOOK_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/sales-studio-prompts";
import { validatePlaybookContext } from "@/lib/ai/validate-context";
import {
  COMPLIANCE_LANGUAGE_OVERRIDE,
  isComplianceFocused,
} from "@/lib/ai/language-rules";
import { checkLimit, incrementUsage } from "@/actions/billing";

export const maxDuration = 120;

interface PlaybookRequestBody {
  bundle_id: string;
  org_name: string;
  org_target_verticals: string[];
}

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

  let body: PlaybookRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.bundle_id) {
    return Response.json({ error: "bundle_id is required" }, { status: 400 });
  }

  // Verify bundle ownership
  const bundle = await getBundleById(body.bundle_id);
  if (!bundle || bundle.org_id !== orgId) {
    return Response.json({ error: "Service not found" }, { status: 404 });
  }

  // Build the full context via the context builder
  const studioCtx = await buildSalesStudioContext(body.bundle_id);

  // Get version ID for playbook persistence
  const versions = await getVersionsByBundleId(body.bundle_id);
  const latestVersionId = versions.length > 0 ? versions[0].id : null;

  // Validation gate
  const validation = validatePlaybookContext({
    serviceName: studioCtx.serviceName,
    outcomeStatement: studioCtx.outcomes[0]?.statement ?? "",
    toolCount: studioCtx.toolsInternal.length,
  });
  if (!validation.valid) {
    return Response.json(
      { error: "Insufficient context", missing: validation.missing },
      { status: 422 }
    );
  }

  // Build prompts using the context
  let userPrompt = buildPlaybookPrompt(studioCtx, {
    orgName: body.org_name || "",
    targetVerticals: body.org_target_verticals ?? [],
  });

  // Append compliance guardrail
  const primaryOutcome = studioCtx.outcomes[0]?.statement ?? "";
  if (
    isComplianceFocused(primaryOutcome) ||
    studioCtx.complianceFrameworks.length > 0
  ) {
    userPrompt += COMPLIANCE_LANGUAGE_OVERRIDE;
  }

  // Stream from Anthropic
  try {
    const client = getAnthropicClient();
    const userId = user.id;

    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      max_tokens: 8192,
      system: PLAYBOOK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

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

          // Persist playbook after stream completes
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

    await incrementUsage("ai_generation");
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
