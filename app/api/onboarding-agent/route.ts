import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { incrementUsage } from "@/actions/billing";
import { logAgentActivity } from "@/lib/agents/log-activity";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a concise MSP stack advisor inside Stackteryx's onboarding wizard.
Your job: give brief, sharp commentary as an MSP selects the vendor tools they already use.

Rules:
- Keep EVERY response to 1–3 short sentences. Never bullet points, never headers.
- Be direct and specific. Mention vendor names and dollar values when relevant.
- If they select two tools in the same category, warn about redundancy.
- If a critical category (EDR, MFA, Email Security, Backup) is empty, say so once.
- If their selection looks solid, give a short cost sanity check (e.g., "at 50 endpoints, that's roughly $X/mo cost before margin").
- Never say "Great choice!" or give generic praise. Be like a knowledgeable peer, not a chatbot.
- If fewer than 3 tools are selected, encourage them to think about their full security stack.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

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

  const { selectedVendors, endpointRange } = await req.json();

  const endpointCount: Record<string, number> = {
    small: 15,
    smb: 50,
    mid: 200,
    enterprise: 750,
  };
  const eps = endpointCount[endpointRange as string] ?? 50;

  const context = selectedVendors?.length
    ? `The user has selected these tools so far: ${(selectedVendors as string[]).join(", ")}.
Their typical client size: ~${eps} endpoints.
Respond with brief, specific commentary about their current selection.`
    : `The user hasn't selected any tools yet. Encourage them to start with their core security tools.`;

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: context }],
  });

  // Track usage + agent activity (fire-and-forget)
  incrementUsage("ai_generation").catch((err) => {
    console.error("[BILLING] incrementUsage failed:", err);
  });
  try {
    logAgentActivity({
      orgId: profile.active_org_id,
      agentId: "aria",
      activityType: "generation",
      title: "Aria guided onboarding setup",
    });
  } catch {
    /* never block */
  }

  return result.toTextStreamResponse();
}
