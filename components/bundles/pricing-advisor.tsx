"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo } from "react";
import { Bot, Send, X, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { BundleVersionWithTools } from "@/lib/types";

// v6 UIMessage parts — extract plain text for rendering
function getMessageText(message: { parts?: { type: string; text?: string }[] }): string {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

interface PricingAdvisorProps {
  version: BundleVersionWithTools;
  bundleName: string;
}

const SUGGESTED_PROMPTS = [
  "Why is this bundle flagged and how do I fix it?",
  "What margin would we get at 100 seats?",
  "Summarize this version for a client proposal",
  "How can I improve the margin without raising the price?",
];

function MessageBubble({
  role,
  text,
}: {
  role: "user" | "assistant";
  text: string;
}) {
  if (!text) return null;
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-2 text-sm", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground border border-border"
        )}
      >
        {isUser ? "Y" : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground border border-border rounded-tl-sm"
        )}
      >
        {text}
      </div>
    </div>
  );
}

export function PricingAdvisor({ version, bundleName }: PricingAdvisorProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const context = useMemo(
    () => ({
      bundle_name: bundleName,
      version_number: version.version_number,
      seat_count: version.seat_count,
      contract_term_months: version.contract_term_months,
      risk_tier: version.risk_tier,
      target_margin_pct: version.target_margin_pct,
      overhead_pct: version.overhead_pct,
      labor_pct: version.labor_pct,
      discount_pct: version.discount_pct,
      computed_true_cost_per_seat: version.computed_true_cost_per_seat,
      computed_suggested_price: version.computed_suggested_price,
      computed_discounted_price: version.computed_discounted_price,
      computed_margin_pre_discount: version.computed_margin_pre_discount,
      computed_margin_post_discount: version.computed_margin_post_discount,
      computed_mrr: version.computed_mrr,
      computed_arr: version.computed_arr,
      pricing_flags: version.pricing_flags,
      tools: version.tools.map((vt) => ({
        id: vt.tool_id,
        name: vt.tool?.name ?? vt.tool_id,
        vendor: vt.tool?.vendor,
        category: vt.tool?.category,
        pricing_model: vt.tool?.pricing_model,
        per_seat_cost: vt.tool?.per_seat_cost,
        flat_monthly_cost: vt.tool?.flat_monthly_cost,
        vendor_minimum_monthly: vt.tool?.vendor_minimum_monthly,
        labor_cost_per_seat: vt.tool?.labor_cost_per_seat,
        tier_rules: vt.tool?.tier_rules ?? [],
        quantity_multiplier: vt.quantity_multiplier,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version.id]
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/agent", body: { context } }),
    [context]
  );

  const { messages, sendMessage, regenerate, stop, status, setMessages } =
    useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, open]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage({ text });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const hasFlags = version.pricing_flags && version.pricing_flags.length > 0;
  const hasErrors = version.pricing_flags?.some((f) => f.severity === "error");
  const visibleMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition-all hover:scale-105 active:scale-95",
          hasErrors
            ? "bg-red-600 text-white hover:bg-red-700"
            : hasFlags
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        <Sparkles className="h-4 w-4" />
        <span>AI Advisor</span>
        {hasFlags && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {version.pricing_flags!.length}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="flex-shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-sm font-semibold leading-none">
                    AI Pricing Advisor
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bundleName} · v{version.version_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {visibleMessages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setMessages([])}
                    title="Clear conversation"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {visibleMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Ask me anything about this version
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      I have full context on the pricing, tools, and flags
                    </p>
                  </div>

                  {hasFlags && (
                    <div className="w-full rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left">
                      <p className="text-xs font-medium text-amber-400">
                        {hasErrors ? "⚠️" : "ℹ️"}{" "}
                        {version.pricing_flags!.length} pricing flag
                        {version.pricing_flags!.length > 1 ? "s" : ""} detected
                      </p>
                      <p className="mt-0.5 text-xs text-amber-400/70">
                        Ask me to explain them or suggest fixes.
                      </p>
                    </div>
                  )}

                  <div className="w-full space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Try asking:
                    </p>
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleMessages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      role={m.role as "user" | "assistant"}
                      text={getMessageText(m)}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 text-sm">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                      <div className="flex items-center rounded-xl rounded-tl-sm border border-border bg-muted px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  )}
                  {visibleMessages.length > 0 && !isLoading && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => regenerate()}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Regenerate last response
                      </button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="flex-shrink-0 border-t bg-white px-4 py-3">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this bundle version..."
                  rows={1}
                  className="min-h-[38px] max-h-32 resize-none text-sm"
                />
                {isLoading ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => stop()}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    disabled={!input.trim()}
                    onClick={handleSend}
                    className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Powered by Claude · Enter to send, Shift+Enter for newline
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
