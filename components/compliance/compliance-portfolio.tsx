"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  enableFrameworkAction,
  disableFrameworkAction,
  assessClientComplianceAction,
  assessAllClientsAction,
} from "@/actions/compliance";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Settings,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface FrameworkInfo {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  targetAudience: string;
  controlsTotal: number;
  controlsScorable: number;
  controlsManual: number;
  enabled: boolean;
}

interface ClientInfo {
  id: string;
  name: string;
  status: string;
}

interface CompliancePortfolioProps {
  frameworks: FrameworkInfo[];
  clients: ClientInfo[];
  scoresByFramework: Record<
    string,
    { client_id: string; score_pct: number; computed_at: string }[]
  >;
  userRole: UserRole;
}

// ── Score color helpers ─────────────────────────────────────────────────────

function getScoreColor(pct: number): string {
  if (pct >= 80) return "text-[#A8FF3E]";
  if (pct >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getScoreBg(pct: number): string {
  if (pct >= 80) return "bg-[#A8FF3E]/10";
  if (pct >= 50) return "bg-yellow-400/10";
  return "bg-red-400/10";
}

function getScoreBorder(pct: number): string {
  if (pct >= 80) return "border-[#A8FF3E]/20";
  if (pct >= 50) return "border-yellow-400/20";
  return "border-red-400/20";
}

function getScoreIcon(pct: number) {
  if (pct >= 80) return <CheckCircle2 className="h-4 w-4 text-[#A8FF3E]" />;
  if (pct >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

// ── Component ───────────────────────────────────────────────────────────────

export function CompliancePortfolio({
  frameworks,
  clients,
  scoresByFramework,
  userRole: _userRole,
}: CompliancePortfolioProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localFrameworks, setLocalFrameworks] = useState(frameworks);
  const [assessingClient, setAssessingClient] = useState<string | null>(null);
  const [assessingAll, setAssessingAll] = useState(false);

  // Currently selected framework (first enabled, or first overall)
  const enabledFrameworks = localFrameworks.filter((f) => f.enabled);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(
    enabledFrameworks[0]?.id ?? localFrameworks[0]?.id ?? ""
  );

  const selectedFramework = localFrameworks.find(
    (f) => f.id === selectedFrameworkId
  );
  const scores = scoresByFramework[selectedFrameworkId] ?? [];

  // Stats for the selected framework
  const assessedCount = scores.length;
  const avgScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((sum, s) => sum + s.score_pct, 0) / scores.length
        )
      : 0;
  const belowThreshold = scores.filter((s) => s.score_pct < 50).length;

  // ── Framework toggle ────────────────────────────────────────────────────

  function handleToggleFramework(fwId: string, enable: boolean) {
    startTransition(async () => {
      const result = enable
        ? await enableFrameworkAction(fwId)
        : await disableFrameworkAction(fwId);

      if (result.success) {
        setLocalFrameworks((prev) =>
          prev.map((f) =>
            f.id === fwId ? { ...f, enabled: enable } : f
          )
        );
        toast.success(
          enable ? "Framework enabled" : "Framework disabled"
        );
      } else {
        toast.error(result.error ?? "Failed to toggle framework");
      }
    });
  }

  // ── Single client assess ────────────────────────────────────────────────

  function handleAssessClient(clientId: string) {
    if (!selectedFrameworkId) return;
    setAssessingClient(clientId);
    startTransition(async () => {
      const result = await assessClientComplianceAction(
        clientId,
        selectedFrameworkId
      );
      setAssessingClient(null);
      if (result.success) {
        toast.success(
          `Assessment complete: ${result.data!.scorePct}% compliance`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Assessment failed");
      }
    });
  }

  // ── Batch assess ────────────────────────────────────────────────────────

  function handleAssessAll() {
    if (!selectedFrameworkId || clients.length === 0) return;
    setAssessingAll(true);
    startTransition(async () => {
      const clientIds = clients.map((c) => c.id);
      const result = await assessAllClientsAction(
        selectedFrameworkId,
        clientIds
      );
      setAssessingAll(false);
      if (result.success) {
        toast.success(
          `Assessed ${result.data!.assessed} clients${result.data!.errors > 0 ? ` (${result.data!.errors} errors)` : ""}`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Batch assessment failed");
      }
    });
  }

  // ── No frameworks enabled ──────────────────────────────────────────────

  if (enabledFrameworks.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Compliance Frameworks Enabled
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Enable one or more compliance frameworks to start assessing your
              clients&apos; security posture.
            </p>
            <Button onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Configure Frameworks
            </Button>
          </CardContent>
        </Card>

        <FrameworkSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          frameworks={localFrameworks}
          onToggle={handleToggleFramework}
          isPending={isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Framework selector tabs + settings */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {enabledFrameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedFrameworkId(fw.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                selectedFrameworkId === fw.id
                  ? "bg-[#A8FF3E]/10 text-[#A8FF3E] border border-[#A8FF3E]/20"
                  : "bg-[#111111] text-muted-foreground border border-[#1E1E1E] hover:text-foreground"
              )}
            >
              {fw.shortName}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Frameworks
          </Button>
          <Button
            size="sm"
            onClick={handleAssessAll}
            disabled={isPending || assessingAll || clients.length === 0}
          >
            {assessingAll ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Assess All Clients
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      {selectedFramework && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Framework</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedFramework.shortName}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedFramework.controlsScorable} scorable /{" "}
                {selectedFramework.controlsManual} manual controls
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Clients Assessed
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assessedCount}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {clients.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {clients.length - assessedCount} pending assessment
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Score
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", scores.length > 0 ? getScoreColor(avgScore) : "")}>
                {scores.length > 0 ? `${avgScore}%` : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                Weighted compliance score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Below 50%
              </CardTitle>
              <ShieldX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", belowThreshold > 0 ? "text-red-400" : "")}>
                {belowThreshold}
              </div>
              <p className="text-xs text-muted-foreground">
                Clients needing attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Client grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Client Compliance Grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active clients found. Add clients first.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((client) => {
                const clientScore = scores.find(
                  (s) => s.client_id === client.id
                );
                const isAssessing = assessingClient === client.id;

                return (
                  <div
                    key={client.id}
                    className={cn(
                      "rounded-lg border p-4 transition-colors",
                      clientScore
                        ? cn(getScoreBg(clientScore.score_pct), getScoreBorder(clientScore.score_pct))
                        : "border-[#1E1E1E] bg-[#111111]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-sm font-medium hover:text-[#A8FF3E] transition-colors truncate block"
                        >
                          {client.name}
                        </Link>
                        {clientScore ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            {getScoreIcon(clientScore.score_pct)}
                            <span
                              className={cn(
                                "text-lg font-bold",
                                getScoreColor(clientScore.score_pct)
                              )}
                            >
                              {clientScore.score_pct}%
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">
                              {new Date(
                                clientScore.computed_at
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Not assessed
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {clientScore && clientScore.score_pct < 50 && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 px-2 text-xs"
                          >
                            <Link href={`/clients/${client.id}`}>
                              Fix Gaps →
                            </Link>
                          </Button>
                        )}
                        {clientScore && clientScore.score_pct >= 50 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 px-2"
                          >
                            <Link href={`/clients/${client.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleAssessClient(client.id)}
                          disabled={isPending || isAssessing}
                        >
                          {isAssessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <FrameworkSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        frameworks={localFrameworks}
        onToggle={handleToggleFramework}
        isPending={isPending}
      />
    </div>
  );
}

// ── Framework Settings Dialog ───────────────────────────────────────────────

function FrameworkSettingsDialog({
  open,
  onOpenChange,
  frameworks,
  onToggle,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworks: FrameworkInfo[];
  onToggle: (fwId: string, enable: boolean) => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compliance Frameworks</DialogTitle>
          <DialogDescription>
            Enable the frameworks you want to assess clients against.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {frameworks.map((fw) => (
            <div
              key={fw.id}
              className="flex items-start justify-between gap-4 rounded-lg border border-[#1E1E1E] bg-[#111111] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fw.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {fw.version}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fw.targetAudience}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fw.controlsTotal} controls ({fw.controlsScorable} scorable)
                </p>
              </div>
              <Button
                variant={fw.enabled ? "default" : "outline"}
                size="sm"
                onClick={() => onToggle(fw.id, !fw.enabled)}
                disabled={isPending}
                className={cn(
                  "shrink-0",
                  fw.enabled &&
                    "bg-[#A8FF3E] text-black hover:bg-[#A8FF3E]/90"
                )}
              >
                {fw.enabled ? "Enabled" : "Enable"}
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
