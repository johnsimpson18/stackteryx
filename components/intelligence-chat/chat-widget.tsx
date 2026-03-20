"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChatMessage, type ChatMessage, type ChatAction, type ChatResponse } from "@/actions/intelligence-chat";
import { OrchestrationDisplay } from "./orchestration-display";
import type { OrchestrationPlan } from "@/lib/intelligence/agent-orchestrator";
import { ServicePreviewCard } from "./action-cards/service-preview-card";
import { OpenModuleCard } from "./action-cards/open-module-card";
import { ShowSignalsCard } from "./action-cards/show-signals-card";
import { RepricingCard } from "./action-cards/repricing-card";
import type { ChatContext } from "@/lib/intelligence/chat-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  action: ChatAction | null;
  orchestration: OrchestrationPlan | null;
  followUp: string;
}

function generateWelcome(ctx: ChatContext): string {
  if (!ctx.journey.hasServices) {
    return "You haven\u2019t built any services yet. Tell me what you sell and I\u2019ll design your first bundle.";
  }
  if (ctx.practice.avgMargin > 0 && ctx.practice.avgMargin < ctx.practice.targetMargin) {
    const gap = ctx.practice.targetMargin - ctx.practice.avgMargin;
    return `Your average margin is ${ctx.practice.avgMargin}% \u2014 ${gap}% below your ${ctx.practice.targetMargin}% target. Want me to show you what\u2019s pulling it down?`;
  }
  if (ctx.scoutSignals.length > 0) {
    return `Scout flagged ${ctx.scoutSignals.length} thing${ctx.scoutSignals.length !== 1 ? "s" : ""} in your portfolio. Want a rundown?`;
  }
  return "What do you want to work on today?";
}

function generateChips(ctx: ChatContext): { label: string; message: string }[] {
  const chips: { label: string; message: string }[] = [];

  if (!ctx.journey.hasServices) {
    chips.push({ label: "Build my first service", message: "Help me build my first service bundle from my tools" });
  }
  if (ctx.practice.avgMargin > 0 && ctx.practice.avgMargin < ctx.practice.targetMargin) {
    chips.push({ label: "Fix my margins", message: "Which of my services have the worst margins and how do I fix them?" });
  }
  if (ctx.scoutSignals.length > 0) {
    chips.push({ label: "Scout has alerts", message: "What is Scout flagging right now?" });
  }
  chips.push({ label: "How profitable am I?", message: "Give me an honest assessment of my practice profitability" });

  return chips.slice(0, 3);
}

interface ChatWidgetProps {
  context: ChatContext;
}

export function ChatWidget({ context }: ChatWidgetProps) {
  const welcome = generateWelcome(context);
  const chips = generateChips(context);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: welcome,
      action: null,
      orchestration: null,
      followUp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const conversationHistory = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Log behavior on unmount (fire-and-forget)
  useEffect(() => {
    return () => {
      if (messages.length > 1) {
        const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content);
        const acted = messages
          .filter((m) => m.action)
          .map((m) => m.action?.type ?? "");
        import("@/actions/intelligence-chat").then(({ saveChatBehavior }) => {
          saveChatBehavior(userMsgs.slice(0, 5), acted).catch(() => {});
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(userMessage: string) {
    if (!userMessage.trim() || isLoading) return;

    setHasInteracted(true);
    setInput("");

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userMessage,
      action: null,
      orchestration: null,
      followUp: "",
    };
    setMessages((prev) => [...prev, userMsg]);
    conversationHistory.current.push({ role: "user", content: userMessage });

    setIsLoading(true);

    const placeholderId = `a-${Date.now()}`;

    // Add streaming placeholder
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        role: "assistant",
        content: "",
        action: null,
        orchestration: null,
        followUp: "",
      },
    ]);

    try {
      // Try streaming first
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage,
          conversationHistory: conversationHistory.current,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream unavailable");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));

          if (json.type === "chunk") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? { ...m, content: m.content + json.text }
                  : m,
              ),
            );
          } else if (json.type === "done") {
            const r = json.response;
            conversationHistory.current.push({
              role: "assistant",
              content: r.message + (r.followUp ? `\n\n${r.followUp}` : ""),
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? {
                      ...m,
                      content: r.message,
                      reasoning: r.reasoning,
                      action: r.action,
                      orchestration: r.orchestration as OrchestrationPlan | null,
                      followUp: r.followUp,
                    }
                  : m,
              ),
            );
          } else if (json.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === placeholderId
                  ? { ...m, content: "Something went wrong. Try again." }
                  : m,
              ),
            );
          }
        }
      }
    } catch {
      // Fallback to standard API call
      try {
        const response = await sendChatMessage(userMessage, conversationHistory.current);
        conversationHistory.current.push({
          role: "assistant",
          content: response.message + (response.followUp ? `\n\n${response.followUp}` : ""),
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: response.message,
                  reasoning: response.reasoning,
                  action: response.action,
                  orchestration: response.orchestration as OrchestrationPlan | null,
                  followUp: response.followUp,
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: "Something went wrong. Try again." }
              : m,
          ),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Stackteryx Intelligence
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "var(--font-mono-alt)" }}>
          Context-aware
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="overflow-y-auto px-5 py-4 space-y-3"
        style={{ maxHeight: hasInteracted ? 400 : 160 }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div
                  className="rounded-lg px-3 py-2 max-w-[80%] text-sm"
                  style={{
                    background: "#c8f135",
                    color: "#0A0A0A",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[90%]">
                <div
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #1a1a1a",
                    color: "#cccccc",
                    fontFamily: "var(--font-mono-alt)",
                    lineHeight: 1.6,
                  }}
                >
                  {msg.content}
                </div>
                {msg.orchestration && <OrchestrationDisplay plan={msg.orchestration} />}
                {msg.action && <ActionCard action={msg.action} />}
                {msg.reasoning && <ReasoningToggle reasoning={msg.reasoning} />}
                {msg.followUp && (
                  <p
                    className="text-xs mt-1.5 px-1"
                    style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
                  >
                    {msg.followUp}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        )}
      </div>

      {/* Quick chips — only show before first interaction */}
      {!hasInteracted && chips.length > 0 && (
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.message)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: "transparent",
                border: "1px solid #333333",
                color: "#888888",
                fontFamily: "var(--font-mono-alt)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c8f135";
                e.currentTarget.style.color = "#c8f135";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#333333";
                e.currentTarget.style.color = "#888888";
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-4 pt-2 flex gap-2" style={{ borderTop: "1px solid #1e1e1e" }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your practice..."
          disabled={isLoading}
          className="flex-1 bg-background/50"
        />
        <Button
          size="icon"
          onClick={() => handleSend(input)}
          disabled={isLoading || !input.trim()}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function ReasoningToggle({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1 px-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
        style={{ fontFamily: "var(--font-mono-alt)" }}
      >
        {expanded ? "Why \u2191" : "Why \u2193"}
      </button>
      {expanded && (
        <p
          className="text-[11px] mt-1 leading-relaxed"
          style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
        >
          {reasoning}
        </p>
      )}
    </div>
  );
}

function ActionCard({ action }: { action: ChatAction }) {
  const data = action.data as Record<string, unknown>;

  switch (action.type) {
    case "build_service_preview":
      return <ServicePreviewCard data={data as never} />;
    case "open_module":
      return <OpenModuleCard data={data as { href: string; label: string; reason: string }} />;
    case "show_signals":
      return <ShowSignalsCard data={data as { signals: { title: string; clientName?: string; cta?: string }[] }} />;
    case "suggest_repricing":
      return <RepricingCard data={data as { serviceId: string; serviceName: string; currentMargin: number; suggestedPrice: number; targetMargin: number }} />;
    default:
      return null;
  }
}
