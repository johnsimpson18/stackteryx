"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Status lines ────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Analyzing your tool stack and delivery costs...",
  "Identifying service opportunities for your market...",
  "Preparing service suggestions based on your outcomes...",
  "Calculating margin scenarios for your pricing targets...",
  "Building your sales materials framework...",
  "Scoring your portfolio coverage...",
  "Preparing your workspace...",
  "Your suggestions are ready.",
];

type StepStatus = "pending" | "active" | "complete";

// ── Component ───────────────────────────────────────────────────────────────

export function BuildingScreen({ orgId }: { orgId: string }) {
  const [steps, setSteps] = useState<StepStatus[]>(
    STEP_LABELS.map(() => "pending")
  );
  const [error, setError] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(
      `/api/onboarding/generate?org_id=${encodeURIComponent(orgId)}`
    );
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          es.close();
          return;
        }

        setSteps((prev) => {
          const next = [...prev];
          // Mark all steps before current as complete
          for (let i = 0; i < data.step - 1; i++) {
            next[i] = "complete";
          }
          // Mark current step
          next[data.step - 1] = data.status ?? "active";
          return next;
        });

        if (data.done) {
          es.close();
          // Pause 800ms, then fade and redirect
          setTimeout(() => {
            setFading(true);
            setTimeout(() => {
              router.push("/onboarding/results");
            }, 500);
          }, 800);
        }
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setError("Connection lost. Please refresh the page.");
    };

    return () => {
      es.close();
    };
  }, [orgId, router]);

  const completedSteps = steps.filter((s) => s === "complete").length;
  const progress = (completedSteps / STEP_LABELS.length) * 100;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center app-grid-bg transition-opacity duration-500"
      style={{
        backgroundColor: "#0A0A0A",
        opacity: fading ? 0 : 1,
      }}
    >
      <div className="w-full px-6" style={{ maxWidth: 600 }}>
        {/* Wordmark */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stackteryx-logo.svg" alt="Stackteryx" height={36} style={{ height: 36, width: "auto", display: "inline-block" }} />
        </div>

        {/* Headline */}
        <h1
          className="text-center font-bold uppercase tracking-tight mb-10"
          style={{
            fontFamily: "var(--font-display)",
            color: "#FFFFFF",
            fontSize: 48,
          }}
        >
          PREPARING YOUR SUGGESTIONS
        </h1>

        {/* Terminal log */}
        <div
          className="rounded-lg border mb-6"
          style={{
            backgroundColor: "#111111",
            borderColor: "#1E1E1E",
            padding: 24,
          }}
        >
          <div className="space-y-2">
            {STEP_LABELS.map((label, i) => {
              const status = steps[i];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3"
                  style={{
                    fontFamily: "var(--font-mono-alt)",
                    fontSize: 13,
                  }}
                >
                  {/* Icon */}
                  {status === "pending" && (
                    <span style={{ color: "#333333", width: 16, textAlign: "center" }}>
                      ○
                    </span>
                  )}
                  {status === "active" && (
                    <span
                      className="animate-pulse"
                      style={{ color: "#A8FF3E", width: 16, textAlign: "center" }}
                    >
                      ●
                    </span>
                  )}
                  {status === "complete" && (
                    <span style={{ color: "#A8FF3E", width: 16, textAlign: "center" }}>
                      ✓
                    </span>
                  )}

                  {/* Label */}
                  <span
                    style={{
                      color:
                        status === "complete"
                          ? "#A8FF3E"
                          : status === "active"
                            ? "#CCCCCC"
                            : "#444444",
                    }}
                  >
                    {label}
                    {status === "active" && (
                      <span className="animate-pulse" style={{ color: "#A8FF3E" }}>
                        ▌
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-0.5 w-full rounded-full mb-4"
          style={{ backgroundColor: "#1E1E1E" }}
        >
          <div
            className="h-0.5 rounded-full transition-all duration-500 ease-out"
            style={{
              backgroundColor: "#A8FF3E",
              width: `${progress}%`,
            }}
          />
        </div>

        {/* Muted text */}
        {error ? (
          <p
            className="text-center"
            style={{
              fontFamily: "var(--font-mono-alt)",
              fontSize: 12,
              color: "#EF4444",
            }}
          >
            {error}
          </p>
        ) : (
          <p
            className="text-center"
            style={{
              fontFamily: "var(--font-mono-alt)",
              fontSize: 12,
              color: "#444444",
            }}
          >
            This usually takes about 10 seconds.
          </p>
        )}
      </div>
    </div>
  );
}
