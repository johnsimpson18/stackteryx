import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ToolCategory, EnablementContent } from "@/lib/types";

export const maxDuration = 60;

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a sales enablement writer for a managed security services provider. You write clear, confident, non-technical content that helps sales reps explain and sell security services to business decision-makers. Never include specific dollar amounts or internal cost figures.`;

// ── Enablement section keys ───────────────────────────────────────────────────
const SECTION_KEYS: (keyof EnablementContent)[] = [
  "service_overview",
  "whats_included",
  "talking_points",
  "pricing_narrative",
  "why_us",
];

export async function POST(request: Request) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Org check ─────────────────────────────────────────────────────────
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single();

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 3. API key check ────────────────────────────────────────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 500 }
    );
  }

  // ── 4. Parse body ───────────────────────────────────────────────────────
  let body: { bundle_version_id?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.bundle_version_id) {
    return Response.json(
      { error: "bundle_version_id is required." },
      { status: 400 }
    );
  }

  const versionId = body.bundle_version_id;

  // ── 5. Fetch bundle version with tools ──────────────────────────────────
  const { data: version, error: versionError } = await supabase
    .from("bundle_versions")
    .select("bundle_id")
    .eq("id", versionId)
    .single();

  if (versionError || !version) {
    return Response.json({ error: "Version not found." }, { status: 404 });
  }

  const { data: bundle, error: bundleError } = await supabase
    .from("bundles")
    .select("name, description, org_id")
    .eq("id", version.bundle_id)
    .single();

  if (bundleError || !bundle) {
    return Response.json({ error: "Bundle not found." }, { status: 404 });
  }

  // ── 6. Verify org ownership ─────────────────────────────────────────────
  if (bundle.org_id !== orgId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 7. Fetch tools in this version ──────────────────────────────────────
  const { data: versionTools } = await supabase
    .from("bundle_version_tools")
    .select("tool_id")
    .eq("bundle_version_id", versionId);

  const toolIds = (versionTools ?? []).map((vt) => vt.tool_id);

  let toolDescriptions = "No tools in this bundle.";
  if (toolIds.length > 0) {
    const { data: tools } = await supabase
      .from("tools")
      .select("name, category, vendor")
      .in("id", toolIds);

    if (tools && tools.length > 0) {
      toolDescriptions = tools
        .map((t) => {
          const catLabel =
            CATEGORY_LABELS[t.category as ToolCategory] ?? t.category;
          return `- ${t.name} (${catLabel}): Provided by ${t.vendor}`;
        })
        .join("\n");
    }
  }

  // ── 8. Fetch org name ───────────────────────────────────────────────────
  const settings = await getOrgSettings(orgId);
  const orgName = settings?.workspace_name ?? "Our MSP";

  // ── 9. Build user prompt ────────────────────────────────────────────────
  const userPrompt = `Generate a sales enablement package for the following managed security service bundle.

MSP Name: ${orgName}
Bundle Name: ${bundle.name}
Bundle Description: ${bundle.description || "No description provided."}

Tools included in this bundle:
${toolDescriptions}

Return a JSON object with exactly these five keys. Do not include any text outside the JSON object:
{
  "service_overview": "2-3 paragraph non-technical overview of what this service is, what problem it solves, and who it is best suited for",
  "whats_included": "Plain-english breakdown of each tool and the specific role it plays in delivering the service",
  "talking_points": "5-7 bullet points a sales rep can internalize and use during client conversations. Include objection handlers and differentiation points.",
  "pricing_narrative": "How to frame the conversation about price and value. Use anchoring language. Do not include any specific dollar amounts.",
  "why_us": "Why ${orgName}'s delivery of this service is better than the client trying to assemble this themselves or buying from a competitor"
}`;

  // ── 10. Stream from Anthropic ───────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
          }
        }

        // Parse the completed JSON and emit named events per section
        let parsed: Record<string, string>;
        try {
          parsed = JSON.parse(fullText);
        } catch {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify("Failed to parse AI response as JSON")}\n\n`
            )
          );
          return;
        }

        for (const key of SECTION_KEYS) {
          const value = parsed[key] ?? "";
          controller.enqueue(
            encoder.encode(
              `event: ${key}\ndata: ${JSON.stringify(value)}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify(msg)}\n\n`
          )
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
