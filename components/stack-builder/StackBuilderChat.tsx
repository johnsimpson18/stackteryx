"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Bot, Send, Sparkles, Loader2, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STACK_TOOLS } from "@/lib/stack-builder/seed";
import type { StackTool, BundleState } from "@/lib/stack-builder/types";

interface StackBuilderChatProps {
  bundleState: BundleState;
  onAddTool: (tool: StackTool) => void;
  onRemoveTool: (tool: StackTool) => void;
  onClearStack: () => void;
  onSetBundleName: (name: string) => void;
}

const QUICK_PROMPTS = [
  { label: "SMB essentials", prompt: "Build me a lean SMB security stack for ~25 endpoints with at least 40% margin" },
  { label: "High margin", prompt: "What's the highest-margin bundle I can build?" },
  { label: "Healthcare / HIPAA", prompt: "I need a HIPAA-friendly stack for a 150-seat healthcare client" },
  { label: "Full coverage", prompt: "Build a comprehensive stack covering all core security categories" },
  { label: "Microsoft-first", prompt: "Build a stack leaning on Microsoft tools as the foundation" },
  { label: "Start fresh", prompt: "Clear the stack and start over — I want something different" },
];

// Extract plain text from message parts (AI SDK v6 format)
function getMessageText(msg: { parts?: { type: string; text?: string }[] }): string {
  if (!msg.parts) return "";
  return msg.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

// Extract tool invocations from message parts
function getToolInvocations(msg: { parts?: { type: string; toolInvocation?: unknown }[] }) {
  if (!msg.parts) return [];
  return msg.parts
    .filter((p) => p.type === "tool-invocation" && p.toolInvocation)
    .map((p) => p.toolInvocation as {
      toolName: string;
      state: string;
      args?: Record<string, unknown>;
      result?: Record<string, unknown>;
    });
}

function ToolChip({ toolId }: { toolId: string }) {
  const tool = STACK_TOOLS.find((t) => t.id === toolId);
  if (!tool) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
      {tool.name}
    </span>
  );
}

export function StackBuilderChat({
  bundleState,
  onAddTool,
  onRemoveTool,
  onClearStack,
  onSetBundleName,
}: StackBuilderChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  const appliedMessageIds = useRef(new Set<string>());

  const currentToolIds = Object.values(bundleState.selectedByCategory)
    .flat()
    .map((t) => t.id);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/stack-builder-chat",
        body: { currentToolIds, bundleName: bundleState.name },
      }),
    // Re-create transport when tool selection or name changes so context stays fresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentToolIds.join(","), bundleState.name]
  );

  const applyToolResults = useCallback(
    (msg: { id: string; parts?: Array<{ type: string; toolInvocation?: unknown }> }) => {
      if (appliedMessageIds.current.has(msg.id)) return;
      appliedMessageIds.current.add(msg.id);

      const invocations = getToolInvocations(msg);
      for (const inv of invocations) {
        if (inv.state !== "result" || !inv.result) continue;

        if (inv.toolName === "addTools") {
          const result = inv.result as { added?: string[] };
          (result.added ?? []).forEach((id) => {
            const stackTool = STACK_TOOLS.find((t) => t.id === id);
            if (stackTool) onAddTool(stackTool);
          });
        }

        if (inv.toolName === "removeTools") {
          const result = inv.result as { removed?: string[] };
          (result.removed ?? []).forEach((id) => {
            const stackTool = STACK_TOOLS.find((t) => t.id === id);
            if (stackTool) onRemoveTool(stackTool);
          });
        }

        if (inv.toolName === "clearStack") {
          onClearStack();
        }

        if (inv.toolName === "setBundleName") {
          const result = inv.result as { name?: string };
          if (result.name) onSetBundleName(result.name);
        }
      }
    },
    [onAddTool, onRemoveTool, onClearStack, onSetBundleName]
  );

  const { messages, sendMessage, stop, status, setMessages } = useChat({
    transport,
    onFinish: ({ message }) => applyToolResults(message),
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Also apply tool results for any completed messages that arrive mid-stream
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role === "assistant") {
        applyToolResults(msg);
      }
    }
  }, [messages, applyToolResults]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = useCallback(() => {
    setMessages([]);
    appliedMessageIds.current.clear();
  }, [setMessages]);

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
        <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          AI Stack Builder
        </span>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            New conversation
          </button>
        )}
      </div>

      {/* Messages / Empty state */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-5 py-2">
            <div className="flex gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-3.5 py-3 max-w-[calc(100%-3rem)]">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Tell me what kind of client you&apos;re building for and I&apos;ll put together a stack with real pricing and margins. Try:
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  &ldquo;Build a healthcare stack for 80 endpoints, HIPAA-focused, minimum 40% margin&rdquo;
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-2">
                Quick starts
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-xs text-foreground/70 hover:text-foreground"
                  >
                    <Zap className="h-3 w-3 text-primary/60" />
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const text = getMessageText(msg);
            const invocations = getToolInvocations(msg);

            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-sm text-primary-foreground leading-relaxed">{text}</p>
                  </div>
                </div>
              );
            }

            if (msg.role === "assistant") {
              const addedIds = invocations
                .filter((i) => i.toolName === "addTools" && i.state === "result")
                .flatMap((i) => (i.result as { added?: string[] })?.added ?? []);

              const removedIds = invocations
                .filter((i) => i.toolName === "removeTools" && i.state === "result")
                .flatMap((i) => (i.result as { removed?: string[] })?.removed ?? []);

              const cleared = invocations.some(
                (i) => i.toolName === "clearStack" && i.state === "result"
              );

              const newName = invocations
                .filter((i) => i.toolName === "setBundleName" && i.state === "result")
                .map((i) => (i.result as { name?: string })?.name)
                .find(Boolean);

              return (
                <div key={msg.id} className="flex gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="space-y-2 max-w-[calc(100%-3rem)]">
                    {/* Tool action badges */}
                    {(cleared || newName || addedIds.length > 0 || removedIds.length > 0) && (
                      <div className="space-y-1.5">
                        {cleared && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400">
                            <RotateCcw className="h-3 w-3" /> Stack cleared
                          </div>
                        )}
                        {newName && (
                          <p className="text-xs text-muted-foreground">
                            Named: <strong className="text-foreground">{newName}</strong>
                          </p>
                        )}
                        {addedIds.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                              Added {addedIds.length} tool{addedIds.length !== 1 ? "s" : ""}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {addedIds.map((id) => <ToolChip key={id} toolId={id} />)}
                            </div>
                          </div>
                        )}
                        {removedIds.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Removed</p>
                            <div className="flex flex-wrap gap-1">
                              {removedIds.map((id) => <ToolChip key={id} toolId={id} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text response */}
                    {text && (
                      <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-3.5 py-3">
                        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {text}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Analyzing and building your stack…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your client or what you need…"
            rows={2}
            disabled={isLoading}
            className={cn(
              "flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm",
              "text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            )}
          />
          {isLoading ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={stop}
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              <span className="h-3 w-3 rounded-sm bg-foreground/60" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              disabled={!inputText.trim()}
              onClick={handleSend}
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/30 mt-1.5 text-right pr-12">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
