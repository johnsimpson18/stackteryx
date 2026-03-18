"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  calculateAndSaveHealthScore,
  type ClientHealthRecord,
} from "@/actions/client-health";

// ── Color helpers ────────────────────────────────────────────────────────────

function scoreColor(color: "green" | "amber" | "red"): string {
  if (color === "green") return "text-emerald-400";
  if (color === "amber") return "text-amber-400";
  return "text-red-400";
}

function scoreBg(color: "green" | "amber" | "red"): string {
  if (color === "green") return "bg-emerald-400";
  if (color === "amber") return "bg-amber-400";
  return "bg-red-400";
}

function barColor(score: number): string {
  if (score >= 65) return "bg-emerald-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-red-400";
}

function gradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    A: "Excellent",
    B: "Good",
    C: "Fair",
    D: "Poor",
    F: "Critical",
  };
  return labels[grade] ?? grade;
}

// ── Compact variant (for tables/lists) ───────────────────────────────────────

interface CompactProps {
  score: ClientHealthRecord | null;
}

export function HealthScoreCompact({ score }: CompactProps) {
  if (!score) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn("h-2 w-2 rounded-full", scoreBg(score.color))}
      />
      <span
        className={cn("text-xs font-mono font-semibold", scoreColor(score.color))}
      >
        {score.overallScore}
      </span>
      {score.scoreDelta !== null && score.scoreDelta !== 0 && (
        <span
          className={cn(
            "text-[10px] font-mono",
            score.scoreDelta > 0 ? "text-emerald-500" : "text-red-500",
          )}
        >
          {score.scoreDelta > 0 ? "+" : ""}
          {score.scoreDelta}
        </span>
      )}
    </div>
  );
}

// ── Full variant (for client detail page) ────────────────────────────────────

interface FullProps {
  clientId: string;
  initialScore: ClientHealthRecord | null;
}

interface DimensionRowProps {
  label: string;
  score: number;
  gaps: string[];
}

function DimensionRow({ label, score, gaps }: DimensionRowProps) {
  const filled = Math.round(score / 10);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-mono font-medium">{score}%</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      {gaps.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {gaps.map((gap) => (
            <span
              key={gap}
              className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              {score >= 65 ? "✓" : "⚠"} {gap}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealthScoreFull({ clientId, initialScore }: FullProps) {
  const [score, setScore] = useState<ClientHealthRecord | null>(initialScore);
  const [isPending, startTransition] = useTransition();

  function handleRecalculate() {
    startTransition(async () => {
      const result = await calculateAndSaveHealthScore(clientId);
      setScore(result);
    });
  }

  if (!score) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client Health Score</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecalculate}
            disabled={isPending}
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1", isPending && "animate-spin")}
            />
            Calculate
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No health score calculated yet. Click Calculate to analyze this
            client.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Client Health Score</CardTitle>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-2xl font-bold font-mono",
                scoreColor(score.color),
              )}
            >
              {score.overallScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
            <span
              className={cn(
                "text-xs font-semibold px-1.5 py-0.5 rounded",
                score.color === "green"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : score.color === "amber"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400",
              )}
            >
              {score.grade}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {score.scoreDelta !== null && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs font-mono",
                score.scoreDelta > 0
                  ? "text-emerald-500"
                  : score.scoreDelta < 0
                    ? "text-red-500"
                    : "text-muted-foreground",
              )}
            >
              {score.scoreDelta > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : score.scoreDelta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {score.scoreDelta > 0 ? "+" : ""}
              {score.scoreDelta}
            </div>
          )}
          {score.previousScore === null && (
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              New
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecalculate}
            disabled={isPending}
          >
            <RefreshCw
              className={cn("h-3 w-3 mr-1", isPending && "animate-spin")}
            />
            Recalculate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DimensionRow
          label="Stack Coverage"
          score={score.stackScore}
          gaps={score.stackGaps}
        />
        <DimensionRow
          label="Compliance"
          score={score.complianceScore}
          gaps={score.complianceGaps}
        />
        <DimensionRow
          label="Advisory"
          score={score.advisoryScore}
          gaps={score.advisoryGaps}
        />
        <DimensionRow
          label="Commercial"
          score={score.commercialScore}
          gaps={score.commercialGaps}
        />
      </CardContent>
    </Card>
  );
}
