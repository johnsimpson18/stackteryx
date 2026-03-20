"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useIntelligencePanel } from "@/components/providers/intelligence-panel-provider";
import { ChatPanel } from "./chat-panel";
import type { ChatContext } from "@/lib/intelligence/chat-context";

interface IntelligencePanelGlobalProps {
  context: ChatContext | null;
}

export function IntelligencePanelGlobal({ context }: IntelligencePanelGlobalProps) {
  const { isOpen, close } = useIntelligencePanel();
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";

  const pageContext = useMemo(() => {
    if (pathname?.startsWith("/services")) return "viewing services";
    if (pathname?.startsWith("/clients")) return "viewing clients";
    if (pathname?.startsWith("/stack-builder")) return "using Stack Builder";
    if (pathname?.startsWith("/sales-studio")) return "in Sales Studio";
    if (pathname?.startsWith("/fractional-cto") || pathname?.startsWith("/cto-briefs")) return "in Fractional CTO";
    if (pathname?.startsWith("/stack-catalog")) return "in Tools & Costs";
    if (pathname?.startsWith("/compliance")) return "in Compliance module";
    if (pathname?.startsWith("/portfolio-intelligence")) return "viewing Portfolio Intelligence";
    return null;
  }, [pathname]);

  // Augment context with page context
  const augmentedContext = useMemo(() => {
    if (!context) return null;
    return {
      ...context,
      // Pass page context via the profile's biggestChallenge field addition
      // The system prompt already includes this as context
      profile: {
        ...context.profile,
        biggestChallenge: pageContext
          ? `${context.profile.biggestChallenge} [Currently ${pageContext}]`
          : context.profile.biggestChallenge,
      },
    };
  }, [context, pageContext]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 z-[500] flex flex-col"
      style={{
        top: 48, // topbar height
        bottom: 0,
        width: 400,
        background: "#0A0A0A",
        borderLeft: "1px solid #1e1e1e",
        transition: "transform 0.2s ease",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#c8f135" }}>&#10022;</span>
          <span
            className="text-xs font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Stackteryx Intelligence
          </span>
        </div>
        <button
          onClick={close}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dashboard hint */}
      {isDashboard && (
        <div
          className="px-4 py-2 text-[10px] text-muted-foreground/50 shrink-0"
          style={{ borderBottom: "1px solid #1e1e1e", fontFamily: "var(--font-mono-alt)" }}
        >
          Full chat is available below on your dashboard.
        </div>
      )}

      {/* Chat panel fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {augmentedContext ? (
          <ChatPanel context={augmentedContext} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading context...</p>
          </div>
        )}
      </div>
    </div>
  );
}
