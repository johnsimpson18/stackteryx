"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { generatePracticeAssessment, type StoredAssessment } from "@/actions/practice-assessment";
import { toast } from "sonner";

interface PracticeAssessmentCardProps {
  initialAssessment: StoredAssessment | null;
  practiceChanged: boolean;
}

export function PracticeAssessmentCard({
  initialAssessment,
  practiceChanged: initialPracticeChanged,
}: PracticeAssessmentCardProps) {
  const [assessment, setAssessment] = useState<StoredAssessment | null>(initialAssessment);
  const [practiceChanged, setPracticeChanged] = useState(initialPracticeChanged);
  const [isGenerating, startGeneration] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRefresh() {
    setError(null);
    startGeneration(async () => {
      const result = await generatePracticeAssessment();
      if (result.success && result.assessment) {
        setAssessment(result.assessment);
        setPracticeChanged(false);
      } else {
        setError(result.error ?? "Something went wrong");
        toast.error(result.error ?? "Assessment generation failed");
      }
    });
  }

  function handleChipClick(message: string) {
    window.dispatchEvent(
      new CustomEvent("stackteryx:open-intelligence", { detail: { message } }),
    );
  }

  // Format date
  const generatedDate = assessment?.generatedAt
    ? new Date(assessment.generatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#111111", border: "1px solid #1e1e1e" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
          >
            Practice Assessment
          </span>
          {generatedDate && (
            <span
              className="text-[11px]"
              style={{ color: "#555555", fontFamily: "var(--font-mono-alt)" }}
            >
              Generated {generatedDate}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isGenerating}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-1" />
          )}
          {isGenerating ? "Generating..." : "Refresh"}
        </Button>
      </div>

      {/* Practice changed banner */}
      {practiceChanged && !isGenerating && (
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ background: "#c8f13508", borderBottom: "1px solid #1e1e1e" }}
        >
          <span
            className="text-xs"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
          >
            &#8635; Your practice has changed since this assessment.
          </span>
          <button
            onClick={handleRefresh}
            className="text-xs font-medium transition-colors"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono-alt)" }}
          >
            Refresh now &rarr;
          </button>
        </div>
      )}

      {/* Content */}
      <div className="px-5 py-4">
        {isGenerating && !assessment ? (
          /* Loading skeleton */
          <div className="space-y-3 animate-pulse">
            <div className="h-3 rounded" style={{ background: "#1e1e1e", width: "90%" }} />
            <div className="h-3 rounded" style={{ background: "#1e1e1e", width: "75%" }} />
            <div className="h-3 rounded" style={{ background: "#1e1e1e", width: "85%" }} />
            <div className="h-3 rounded mt-4" style={{ background: "#1e1e1e", width: "70%" }} />
            <div className="h-3 rounded" style={{ background: "#1e1e1e", width: "80%" }} />
          </div>
        ) : error && !assessment ? (
          /* Error state */
          <div className="flex flex-col items-center py-6 text-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try again
            </Button>
          </div>
        ) : assessment ? (
          /* Assessment content */
          <div
            className="text-sm leading-[1.7]"
            style={{ color: "#cccccc", fontFamily: "var(--font-mono-alt)" }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p style={{ margin: "0 0 12px", lineHeight: 1.7, color: "#cccccc", fontFamily: "var(--font-mono-alt)", fontSize: 13 }}>
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong style={{ fontWeight: 600, color: "#FFFFFF" }}>{children}</strong>
                ),
              }}
            >
              {assessment.content}
            </ReactMarkdown>
          </div>
        ) : (
          /* No assessment yet — show generate prompt */
          <div className="flex flex-col items-center py-6 text-center">
            <p
              className="text-sm text-muted-foreground mb-3"
              style={{ fontFamily: "var(--font-mono-alt)" }}
            >
              Get a personalized snapshot of your practice — specific to your tools, services, and verticals.
            </p>
            <Button onClick={handleRefresh} disabled={isGenerating} size="sm">
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Generating...
                </>
              ) : (
                "Generate Assessment"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Chips */}
      {assessment && assessment.chips.length > 0 && (
        <div
          className="flex flex-wrap gap-1.5 px-5 pb-4"
        >
          {assessment.chips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleChipClick(chip)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
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
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
