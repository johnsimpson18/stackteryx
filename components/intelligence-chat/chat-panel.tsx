"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendChatMessage, saveChatBehavior, generateFirstLoadAssessment, markFirstLoadAssessmentComplete, type ChatMessage, type ChatAction, type ChatResponse } from "@/actions/intelligence-chat";
import { ServicePreviewCard } from "./action-cards/service-preview-card";
import { OpenModuleCard } from "./action-cards/open-module-card";
import { ShowSignalsCard } from "./action-cards/show-signals-card";
import { RepricingCard } from "./action-cards/repricing-card";
import { OrchestrationDisplay } from "./orchestration-display";
import { detectSkill, type ChatSkill } from "@/lib/intelligence/chat-skills";
import type { ChatContext } from "@/lib/intelligence/chat-context";
import type { OrchestrationPlan } from "@/lib/intelligence/agent-orchestrator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  action: ChatAction | null;
  orchestration: OrchestrationPlan | null;
  followUp: string;
  suggestedFollowUps?: string[];
  isAssessment?: boolean;
}

function generateWelcome(ctx: ChatContext): string {
  if (!ctx.journey.hasServices && ctx.tools.toolCount === 0) {
    return "Welcome to Stackteryx. I\u2019m your practice advisor \u2014 I can help you set up your tools, design services, and build proposals.\n\nWhat would you like to start with?";
  }
  if (!ctx.journey.hasServices && ctx.tools.toolCount > 0) {
    return `You have ${ctx.tools.toolCount} tools in your catalog but no services built yet. Want me to design your first service bundle from those tools?`;
  }
  if (ctx.practice.avgMargin > 0 && ctx.practice.avgMargin < ctx.practice.targetMargin) {
    return `Your average margin is ${ctx.practice.avgMargin}% \u2014 ${ctx.practice.targetMargin - ctx.practice.avgMargin}% below your target. Want me to find what\u2019s pulling it down?`;
  }
  if (ctx.scoutSignals.length > 0) {
    return `${ctx.scoutSignals.length} thing${ctx.scoutSignals.length !== 1 ? "s" : ""} need your attention this week. Want a rundown?`;
  }
  return "What do you want to work on today?";
}

function generateChips(ctx: ChatContext): { label: string; message: string }[] {
  const chips: { label: string; message: string }[] = [];

  if (!ctx.journey.hasServices && ctx.tools.toolCount === 0) {
    chips.push({ label: "Help me get started", message: "I just signed up. Walk me through how to set up my practice in Stackteryx." });
  }
  if (!ctx.journey.hasServices && ctx.tools.toolCount > 0) {
    chips.push({ label: "Build my first service", message: "I have tools in my catalog. Help me design my first service bundle." });
  }
  if (ctx.practice.avgMargin > 0 && ctx.practice.avgMargin < ctx.practice.targetMargin) {
    chips.push({ label: "My margins are too low", message: `My average margin is ${ctx.practice.avgMargin}% but I want ${ctx.practice.targetMargin}%. What should I fix first?` });
  }
  if (ctx.clientHealth.atRisk.length > 0) {
    chips.push({ label: `${ctx.clientHealth.atRisk.length} clients need attention`, message: "Which of my clients are most at risk right now and what should I do about them?" });
  }
  if (ctx.scoutSignals.some((s) => s.type === "renewal_risk")) {
    chips.push({ label: "Renewals coming up", message: "Which of my clients have contracts renewing soon and how should I prepare?" });
  }
  chips.push({ label: "How profitable am I?", message: "Give me an honest assessment of how profitable my practice is right now." });

  return chips.slice(0, 3);
}

function generateFollowUpChips(action: ChatAction | null, followUp: string): string[] {
  const chips: string[] = [];
  if (followUp) chips.push(followUp);
  if (action?.type === "build_service_preview") {
    chips.push("Generate a proposal for this", "Build another service");
  } else if (action?.type === "suggest_repricing") {
    chips.push("Apply this repricing", "Show other services to fix");
  } else if (action?.type === "show_signals") {
    chips.push("Tell me more", "What should I do first?");
  } else if (action?.type === "open_module") {
    chips.push("What else should I know?");
  } else if (!action && !followUp) {
    chips.push("Tell me more", "What should I do next?");
  }
  return chips.slice(0, 3);
}

interface ChatPanelProps {
  context: ChatContext;
}

export function ChatPanel({ context }: ChatPanelProps) {
  const welcome = generateWelcome(context);
  const defaultChips = generateChips(context);

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: welcome, action: null, orchestration: null, followUp: "" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeSkill, setActiveSkill] = useState<ChatSkill | null>(null);
  const conversationHistory = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [assessmentChips, setAssessmentChips] = useState<{ label: string; message: string }[]>([]);

  const chips = assessmentChips.length > 0
    ? assessmentChips
    : activeSkill?.suggestedFollowUps.length
      ? activeSkill.suggestedFollowUps.map((f) => ({ label: f, message: f }))
      : defaultChips;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-trigger first-load practice assessment
  useEffect(() => {
    if (
      context?.wizardProfile?.isFirstDashboardLoad &&
      messages.length === 1 && // only the welcome message
      !isLoading
    ) {
      (async () => {
        setIsLoading(true);
        setMessages([
          { id: "assessment-loading", role: "assistant", content: "", action: null, orchestration: null, followUp: "" },
        ]);

        try {
          const result = await generateFirstLoadAssessment(context.wizardProfile!);
          setMessages([
            {
              id: "assessment",
              role: "assistant",
              content: result.message,
              action: result.action,
              orchestration: null,
              followUp: result.followUp,
              suggestedFollowUps: result.chips,
              isAssessment: true,
            },
          ]);
          setAssessmentChips(result.chips.map((c) => ({ label: c, message: c })));
          setHasInteracted(false); // keep chips visible
          // Mark assessment as shown so it doesn't repeat
          markFirstLoadAssessmentComplete().catch(() => {});
        } catch {
          // Fallback to welcome message
          setMessages([
            { id: "welcome", role: "assistant", content: welcome, action: null, orchestration: null, followUp: "" },
          ]);
        } finally {
          setIsLoading(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log behavior on unmount
  useEffect(() => {
    return () => {
      if (messages.length > 1) {
        const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content);
        const acted = messages.filter((m) => m.action).map((m) => m.action?.type ?? "");
        saveChatBehavior(userMsgs.slice(0, 5), acted).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend(userMessage: string) {
    if (!userMessage.trim() || isLoading) return;

    // Detect skill on first message
    if (!hasInteracted && !activeSkill) {
      const detected = detectSkill(userMessage);
      if (detected) {
        setActiveSkill(detected);
      }
    }

    setHasInteracted(true);
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: userMessage, action: null, orchestration: null, followUp: "" },
    ]);
    conversationHistory.current.push({ role: "user", content: userMessage });

    setIsLoading(true);
    const placeholderId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: placeholderId, role: "assistant", content: "", action: null, orchestration: null, followUp: "" },
    ]);

    try {
      // Try streaming
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage,
          conversationHistory: conversationHistory.current,
          skillAddendum: activeSkill?.systemAddendum,
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
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === "chunk") {
              setMessages((prev) =>
                prev.map((m) => (m.id === placeholderId ? { ...m, content: m.content + json.text } : m)),
              );
            } else if (json.type === "done") {
              const r = json.response as ChatResponse;
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
                        suggestedFollowUps: generateFollowUpChips(r.action, r.followUp),
                      }
                    : m,
                ),
              );
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch {
      // Fallback to standard call
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
                  suggestedFollowUps: generateFollowUpChips(response.action, response.followUp),
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? { ...m, content: "Something went wrong. Try again." } : m)),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="rounded-xl flex flex-col h-full"
      style={{ background: "#111111", border: "1px solid #1e1e1e", minHeight: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Stackteryx Intelligence
          </span>
        </div>
        {activeSkill && (
          <button
            onClick={() => setActiveSkill(null)}
            className="flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
            style={{ background: "#c8f13515", color: "#c8f135", border: "1px solid #c8f13530", fontFamily: "var(--font-mono-alt)" }}
          >
            {activeSkill.name} <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <div className="flex justify-end">
                <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm" style={{ background: "#c8f135", color: "#0A0A0A", fontFamily: "var(--font-mono-alt)" }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="max-w-[95%]">
                {msg.isAssessment && (
                  <div
                    className="mb-1.5 px-1"
                    style={{
                      fontSize: 10,
                      color: "#c8f135",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    Practice Assessment
                  </div>
                )}
                {msg.content ? (
                  <div className="rounded-lg px-3 py-2 text-sm prose-sm" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p style={{ margin: "0 0 6px", lineHeight: 1.6, color: "#cccccc", fontFamily: "var(--font-mono-alt)", fontSize: 13 }}>{children}</p>,
                        strong: ({ children }) => <strong style={{ fontWeight: 600, color: "#ffffff" }}>{children}</strong>,
                        ul: ({ children }) => <ul style={{ margin: "4px 0 8px", paddingLeft: 16 }}>{children}</ul>,
                        ol: ({ children }) => <ol style={{ margin: "4px 0 8px", paddingLeft: 16 }}>{children}</ol>,
                        li: ({ children }) => <li style={{ marginBottom: 3, fontSize: 13, color: "#cccccc", fontFamily: "var(--font-mono-alt)" }}>{children}</li>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-2 px-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                )}
                {msg.orchestration && <OrchestrationDisplay plan={msg.orchestration} />}
                {msg.action && <ActionCard action={msg.action} />}
                {msg.reasoning && <ReasoningToggle reasoning={msg.reasoning} />}
                {msg.followUp && (
                  <p className="text-[11px] mt-1 px-1" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>
                    {msg.followUp}
                  </p>
                )}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 px-1">
                    {msg.suggestedFollowUps.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handleSend(chip)}
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                        style={{ background: "transparent", border: "1px solid #333333", color: "#888888", fontFamily: "var(--font-mono-alt)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f135"; e.currentTarget.style.color = "#c8f135"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#888888"; }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === "" && null /* dots shown in empty message */}
      </div>

      {/* Chips */}
      {!hasInteracted && chips.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.message)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{ background: "transparent", border: "1px solid #333333", color: "#888888", fontFamily: "var(--font-mono-alt)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c8f135"; e.currentTarget.style.color = "#c8f135"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#888888"; }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-3 pt-2 flex gap-2 shrink-0" style={{ borderTop: "1px solid #1e1e1e" }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
          placeholder="Ask anything about your practice..."
          disabled={isLoading}
          className="flex-1 bg-background/50 text-sm"
        />
        <Button size="icon" onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} className="shrink-0">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function ReasoningToggle({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-1 px-1">
      <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors" style={{ fontFamily: "var(--font-mono-alt)" }}>
        {expanded ? "Why \u2191" : "Why \u2193"}
      </button>
      {expanded && <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}>{reasoning}</p>}
    </div>
  );
}

function ActionCard({ action }: { action: ChatAction }) {
  const data = action.data as Record<string, unknown>;
  switch (action.type) {
    case "build_service_preview": return <ServicePreviewCard data={data as never} />;
    case "open_module": return <OpenModuleCard data={data as { href: string; label: string; reason: string }} />;
    case "show_signals": return <ShowSignalsCard data={data as { signals: { title: string; clientName?: string; cta?: string }[] }} />;
    case "suggest_repricing": return <RepricingCard data={data as { serviceId: string; serviceName: string; currentMargin: number; suggestedPrice: number; targetMargin: number }} />;
    default: return null;
  }
}
