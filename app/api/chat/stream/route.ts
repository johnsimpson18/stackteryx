import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/org-context";
import { getAnthropicClient } from "@/lib/ai/client";
import { stripCodeFences } from "@/lib/ai/validate";
import { incrementUsage } from "@/actions/billing";
import { assembleChatContext } from "@/lib/intelligence/chat-context";
import { buildChatSystemPrompt } from "@/lib/intelligence/chat-system-prompt";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  const body = await request.json();
  const { userMessage, conversationHistory = [], skillAddendum } = body;

  if (!userMessage) {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  // Assemble context
  const context = await assembleChatContext(orgId);
  let systemPrompt = buildChatSystemPrompt(context);

  // Append skill addendum if active
  if (skillAddendum) {
    systemPrompt += `\n\n${skillAddendum}`;
  }
  const trimmedHistory = conversationHistory.slice(-20);

  // Stream response
  const client = getAnthropicClient();

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    temperature: 0.4,
    system: systemPrompt,
    messages: [
      ...trimmedHistory.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ],
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";

      stream.on("text", (text) => {
        fullText += text;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`));
      });

      stream.on("finalMessage", () => {
        // Parse the complete response
        let parsed;
        try {
          parsed = JSON.parse(stripCodeFences(fullText));
        } catch {
          parsed = {
            intent: "advisory",
            message: fullText,
            action: null,
            orchestration: null,
            followUp: "What else can I help with?",
          };
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done", response: parsed })}\n\n`),
        );
        controller.close();

        // Increment usage (fire-and-forget)
        incrementUsage("ai_generation").catch((err) => {
          console.error("[BILLING] incrementUsage failed:", err);
        });
      });

      stream.on("error", (error) => {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Stream error" })}\n\n`,
          ),
        );
        controller.close();
      });
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
