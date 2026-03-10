"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ClientProfileForm } from "./client-profile-form";
import { RecommendationGrid } from "./recommendation-grid";
import type { RecommendRequest } from "@/lib/schemas/recommend";
import type { ClientProfile } from "@/lib/types/recommend";
import type { Tool, UserRole } from "@/lib/types";
import type { OrgSettings } from "@/lib/db/org-settings";

interface RecommendClientProps {
  tools: Tool[];
  settings: OrgSettings;
  userRole: UserRole;
  hasApiKey: boolean;
}

export function RecommendClient({
  tools,
  settings,
  userRole,
  hasApiKey,
}: RecommendClientProps) {
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [streamKey, setStreamKey] = useState(0);

  function handleFormSubmit(data: RecommendRequest) {
    setClientProfile(data as ClientProfile);
    setStreamKey((k) => k + 1);
  }

  function handleStartOver() {
    setClientProfile(null);
  }

  return (
    <div className="space-y-6">
      {/* No API key warning */}
      {!hasApiKey && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
          <strong>ANTHROPIC_API_KEY is not configured.</strong> Add it to your environment
          variables to enable AI recommendations. See{" "}
          <code className="text-xs bg-amber-500/20 rounded px-1 py-0.5">.env.example</code>{" "}
          for reference.
        </div>
      )}

      {!clientProfile ? (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[400px_1fr]">
          {/* Form */}
          <ClientProfileForm
            onSubmit={handleFormSubmit}
            isStreaming={false}
            userRole={userRole}
          />

          {/* Explainer panel */}
          <div className="rounded-xl border border-border bg-card p-6 h-fit space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">How it works</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Fill in the client profile and Claude will analyse your{" "}
                <strong className="text-foreground/80">{tools.length} active tools</strong>{" "}
                to build three progressively comprehensive security bundles — Essential,
                Recommended, and Premium.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  step: "01",
                  title: "AI selects tools",
                  desc: "Claude picks the right combination from your catalog based on the client's industry, risk, and compliance needs.",
                },
                {
                  step: "02",
                  title: "Live pricing calculated",
                  desc: "Your deterministic pricing engine runs immediately — the AI never touches the numbers.",
                },
                {
                  step: "03",
                  title: "One-click bundle creation",
                  desc: "Approve any tier and it becomes a real bundle with a saved version, ready to quote.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="text-xs font-bold text-primary/60 font-mono mt-0.5 w-6 flex-shrink-0">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {tools.length === 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-xs text-amber-300">
                Your tool catalog is empty. Add tools first so Claude has something to
                recommend.
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
              <p className="text-xs text-muted-foreground">
                Powered by Claude — pricing always runs through your deterministic engine.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <RecommendationGrid
          key={streamKey}
          clientProfile={clientProfile}
          toolCatalog={tools}
          workspaceSettings={settings}
          onStartOver={handleStartOver}
        />
      )}
    </div>
  );
}
