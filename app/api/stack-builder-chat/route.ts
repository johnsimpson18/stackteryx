import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { STACK_TOOLS, STACK_CATEGORIES } from "@/lib/stack-builder/seed";

export const maxDuration = 60;

const TOOL_CATALOG = STACK_TOOLS.map((t) => {
  const cat = STACK_CATEGORIES.find((c) => c.id === t.categoryId);
  const margin = Math.round(
    ((t.msrpMonthly - t.costMonthly) / t.msrpMonthly) * 100
  );
  return `• [${t.id}] ${t.name} by ${t.vendor} | Category: ${cat?.name ?? t.categoryId} | Cost: $${t.costMonthly}/seat/mo | MSRP: $${t.msrpMonthly}/seat/mo | Margin: ${margin}%`;
}).join("\n");

const SYSTEM_PROMPT = `You are an expert MSP security stack advisor inside Stackteryx's AI-powered bundle builder.

Your job is to help MSPs and MSSPs build profitable security bundles by understanding their needs in plain English.

== TOOL CATALOG ==
${TOOL_CATALOG}

== CATEGORIES (core = required for a complete stack) ==
${STACK_CATEGORIES.map((c) => `• ${c.name} [${c.id}]${c.isCoreRequired ? " ← CORE REQUIRED" : ""}`).join("\n")}

== YOUR BEHAVIOR ==
- ALWAYS call at least one tool in your first real response. Don't just talk — act.
- Use addTools to add tools. Use clearStack before rebuilding a completely different stack.
- Use setBundleName to name the bundle based on what the user described.
- After tool calls, give a brief 2–3 sentence explanation: what you picked and why, + margin estimate.
- Be direct, like a knowledgeable peer. No fluff. Mention dollar amounts and percentages.
- For SMB (<100 seats): lean on Huntress, DNSFilter, Duo, Proofpoint, KnowBe4, Veeam.
- For mid-market (100–500): add Blumira SIEM, CrowdStrike, Mimecast, Tenable.
- For enterprise: full coverage including PAM, SIEM, advanced EDR.

== CONSTRAINTS ==
- Only use tool IDs that exist in the catalog above.
- Max 8 tools unless user explicitly requests full coverage.
- Max 1 tool per category unless user asks for redundancy.
- When clearing stack, immediately populate it with the new selection.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Verify user belongs to an active org
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", user.id)
    .single();

  if (!profile?.active_org_id) {
    return new Response("No active organization", { status: 400 });
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", profile.active_org_id)
    .single();

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  const { messages: uiMessages, currentToolIds = [], bundleName = "" } =
    await req.json();

  const stackContext =
    currentToolIds.length > 0
      ? `\n\n== CURRENT STACK ==\nBundle currently contains: ${currentToolIds.join(", ")}\nBundle name: "${bundleName || "Unnamed"}"`
      : "\n\n== CURRENT STACK ==\nBundle is empty.";

  const messages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT + stackContext,
    messages,
    stopWhen: stepCountIs(3),
    tools: {
      addTools: {
        description:
          "Add one or more tools from the catalog to the user's bundle. Call this to act on the user's request.",
        inputSchema: z.object({
          toolIds: z
            .array(z.string())
            .describe("Array of tool IDs from the catalog to add"),
          reason: z.string().describe("Brief reason why these tools were selected"),
        }),
        execute: async (params) => {
          const valid = params.toolIds.filter((id: string) =>
            STACK_TOOLS.some((t) => t.id === id)
          );
          const skipped = params.toolIds.filter(
            (id: string) => !STACK_TOOLS.some((t) => t.id === id)
          );
          return { added: valid, skipped, reason: params.reason };
        },
      },

      removeTools: {
        description: "Remove specific tools from the current bundle",
        inputSchema: z.object({
          toolIds: z
            .array(z.string())
            .describe("Array of tool IDs to remove from the bundle"),
          reason: z.string().optional(),
        }),
        execute: async (params) => ({
          removed: params.toolIds,
          reason: params.reason,
        }),
      },

      clearStack: {
        description:
          "Clear all tools from the bundle and start fresh. Only when the user wants a completely different stack.",
        inputSchema: z.object({
          reason: z.string().describe("Why the stack is being cleared"),
        }),
        execute: async (params) => ({ cleared: true, reason: params.reason }),
      },

      setBundleName: {
        description:
          "Set a professional name for the bundle based on what the user described",
        inputSchema: z.object({
          name: z
            .string()
            .describe("Professional bundle name, e.g. 'Healthcare SMB Security Suite'"),
        }),
        execute: async (params) => ({ name: params.name }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
