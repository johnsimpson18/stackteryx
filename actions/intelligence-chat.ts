"use server";

import { getAnthropicClient } from "@/lib/ai/client";
import { stripCodeFences } from "@/lib/ai/validate";
import { getActiveOrgId } from "@/lib/org-context";
import { incrementUsage } from "@/actions/billing";
import { assembleChatContext, type WizardProfile } from "@/lib/intelligence/chat-context";
import { buildChatSystemPrompt, getFirstLoadAssessmentPrompt } from "@/lib/intelligence/chat-system-prompt";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatAction {
  type: "build_service_preview" | "open_module" | "show_signals" | "suggest_repricing";
  data: Record<string, unknown>;
}

export interface ChatResponse {
  intent: "action" | "advisory" | "guide" | "clarify" | "orchestrate";
  message: string;
  reasoning?: string;
  action: ChatAction | null;
  orchestration: {
    agents: { id: string; agentId: string; task: string; status: string }[];
    deliverable: string;
    estimatedTime: string;
  } | null;
  followUp: string;
}

export async function sendChatMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
): Promise<ChatResponse> {
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return {
      intent: "clarify",
      message: "I need you to be logged in to help. Please refresh the page.",
      action: null,
      orchestration: null,
      followUp: "",
    };
  }

  // Assemble context + system prompt
  const context = await assembleChatContext(orgId);
  const systemPrompt = buildChatSystemPrompt(context);

  // Cap conversation history at 20 messages
  const trimmedHistory = conversationHistory.slice(-20);

  // Call Anthropic
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    temperature: 0.4,
    system: systemPrompt,
    messages: [
      ...trimmedHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON response
  let parsed: ChatResponse;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    // Fallback — return raw text as advisory
    parsed = {
      intent: "advisory",
      message: text || "I understand. Let me think about that differently.",
      action: null,
      orchestration: null,
      followUp: "What else can I help with?",
    };
  }

  // Increment AI usage (fire-and-forget)
  incrementUsage("ai_generation").catch((err) => {
    console.error("[BILLING] incrementUsage failed:", err);
  });

  // Log agent activity (fire-and-forget)
  import("@/lib/agents/log-activity").then(({ logAgentActivity }) => {
    const agentMap: Record<string, string> = {
      build_service_preview: "aria",
      suggest_repricing: "margin",
      show_signals: "scout",
      open_module: "aria",
    };
    const agentId = parsed.action
      ? agentMap[parsed.action.type] ?? "aria"
      : "aria";

    logAgentActivity({
      orgId,
      agentId: agentId as "aria" | "margin" | "scout" | "sage" | "pitch" | "horizon",
      activityType: parsed.intent === "action" ? "generation" : "analysis",
      title: `Intelligence Chat: ${parsed.intent === "action" ? "took action" : "provided guidance"}`,
    });
  });

  return parsed;
}

// ── First-Load Assessment ────────────────────────────────────────────────────

export interface AssessmentResponse {
  message: string;
  action: ChatAction | null;
  followUp: string;
  chips: string[];
}

export async function generateFirstLoadAssessment(
  wizardProfile: WizardProfile,
): Promise<AssessmentResponse> {
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return {
      message: "Welcome to Stackteryx. Let me know how I can help you get started.",
      action: null,
      followUp: "",
      chips: ["Help me get started"],
    };
  }

  const context = await assembleChatContext(orgId);
  const systemPrompt =
    buildChatSystemPrompt(context) + "\n\n" + getFirstLoadAssessmentPrompt(wizardProfile);

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    temperature: 0.4,
    system: systemPrompt,
    messages: [
      {
        role: "user" as const,
        content: "Generate my business assessment based on my onboarding answers.",
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  let parsed: ChatResponse;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    parsed = {
      intent: "advisory",
      message: text || "Let me review your practice setup.",
      action: null,
      orchestration: null,
      followUp: "What would you like to focus on first?",
    };
  }

  // Increment AI usage
  incrementUsage("ai_generation").catch((err) => {
    console.error("[BILLING] incrementUsage failed:", err);
  });

  const chips = generateAssessmentChips(wizardProfile);

  return {
    message: parsed.message,
    action: parsed.action,
    followUp: parsed.followUp,
    chips,
  };
}

function generateAssessmentChips(profile: WizardProfile): string[] {
  const chips: string[] = [];

  if (
    profile.serviceModel === "a_la_carte" ||
    profile.serviceModel === "ala_carte"
  ) {
    chips.push("Help me build my first bundle");
  }
  if (profile.blendedMargin != null && profile.blendedMargin < 40) {
    chips.push("Show me which tools are hurting my margin");
  }
  if (profile.targetVerticals.includes("Healthcare")) {
    chips.push("Am I close to HIPAA coverage?");
  }
  if (profile.deliveryModel?.includes("advisory")) {
    chips.push("How do I start charging for advisory?");
  }

  chips.push("What should I do first?");
  return chips.slice(0, 3);
}

export async function markFirstLoadAssessmentComplete(): Promise<void> {
  const orgId = await getActiveOrgId();
  if (!orgId) return;

  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();

  await service
    .from("org_settings")
    .update({ first_load_assessment_shown_at: new Date().toISOString() })
    .eq("org_id", orgId);
}

export async function saveChatBehavior(
  topics: string[],
  actionsTaken: string[],
): Promise<void> {
  const orgId = await getActiveOrgId();
  if (!orgId) return;

  const { createServiceClient } = await import("@/lib/supabase/service");
  const service = createServiceClient();

  await service.from("chat_behavior").insert({
    org_id: orgId,
    session_date: new Date().toISOString().split("T")[0],
    topics,
    actions_taken: actionsTaken,
  });
}
