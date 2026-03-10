"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

interface AgentGuideProps {
  selectedVendorNames: string[];
  endpointRange: string;
  // Trigger re-fetch whenever selection changes
  trigger: number;
}

export function AgentGuide({ selectedVendorNames, endpointRange, trigger }: AgentGuideProps) {
  const [message, setMessage] = useState<string>(
    "Select the tools you currently buy from vendors. I\u2019ll flag redundancies and gaps as you go."
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Don't call the agent on the very first render (trigger=0)
    if (trigger === 0) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setMessage("");

    async function fetchMessage() {
      try {
        const res = await fetch("/api/onboarding-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedVendors: selectedVendorNames,
            endpointRange,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setMessage("Couldn\u2019t load advice — continue selecting your tools.");
          setLoading(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setMessage(text);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessage("Couldn\u2019t load advice right now.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMessage();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Stack Advisor
        </span>
        {loading && (
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin ml-auto" />
        )}
      </div>

      <p className="text-sm text-foreground/85 leading-relaxed min-h-[3rem]">
        {message || "\u00a0"}
      </p>

      {selectedVendorNames.length > 0 && (
        <div className="pt-1 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {selectedVendorNames.length} tool{selectedVendorNames.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}
    </div>
  );
}
