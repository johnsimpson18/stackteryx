"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Printer,
  BookOpen,
  Target,
  MessageSquare,
  Mail,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  getServiceDetailsForPlaybook,
  getCachedPlaybook,
  type ServiceDetailsForPlaybook,
} from "@/actions/sales-studio";
import { tryParsePartialJSON, getCompletedSections } from "@/lib/ai/stream";
import type { BundleType } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface SalesEnablementPanelProps {
  activeBundles: { id: string; name: string; bundle_type: BundleType }[];
  orgName: string;
  orgTargetVerticals: string[];
}

interface PlaybookICP {
  industries?: string[];
  company_size?: string;
  buyer_role?: string;
  security_maturity?: string;
  buying_triggers?: string[];
  qualification_questions?: string[];
}

interface PlaybookTalkTrack {
  opening_statement?: string;
  problem_statement?: string;
  solution_statement?: string;
  proof_points?: string[];
  closing_question?: string;
}

interface PlaybookObjection {
  objection?: string;
  acknowledgment?: string;
  response?: string;
  follow_up_question?: string;
}

interface PlaybookEmail {
  subject?: string;
  body?: string;
}

interface PlaybookEmails {
  cold_outreach?: PlaybookEmail;
  follow_up?: PlaybookEmail;
  post_meeting?: PlaybookEmail;
}

interface PlaybookCheatSheet {
  one_liner?: string;
  top_verticals?: string[];
  stack_tools?: string[];
  top_triggers?: string[];
  differentiators?: string[];
  price_anchor?: string;
}

interface PlaybookData {
  icp?: PlaybookICP;
  talk_track?: PlaybookTalkTrack;
  objections?: PlaybookObjection[];
  emails?: PlaybookEmails;
  cheat_sheet?: PlaybookCheatSheet;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SECTION_SCHEMA = [
  "icp",
  "talk_track",
  "objections",
  "emails",
  "cheat_sheet",
] as const;

const SECTION_LABELS: Record<string, string> = {
  icp: "Ideal Customer Profile",
  talk_track: "Talk Track",
  objections: "Objection Handling",
  emails: "Email Templates",
  cheat_sheet: "Cheat Sheet",
};

const SECTION_ICONS: Record<string, typeof Target> = {
  icp: Target,
  talk_track: MessageSquare,
  objections: BookOpen,
  emails: Mail,
  cheat_sheet: FileText,
};

const PROGRESS_MESSAGES = [
  "Analyzing service positioning...",
  "Building ideal customer profile...",
  "Crafting talk tracks...",
  "Generating objection responses...",
  "Writing email templates...",
  "Assembling cheat sheet...",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    toast.success("Copied to clipboard");
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SalesEnablementPanel({
  activeBundles,
  orgName,
  orgTargetVerticals,
}: SalesEnablementPanelProps) {
  // ── State ─────────────────────────────────────────────────────────────
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [serviceDetails, setServiceDetails] =
    useState<ServiceDetailsForPlaybook | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState(0);
  const [activeSection, setActiveSection] = useState("icp");
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [expandedObjections, setExpandedObjections] = useState<Set<number>>(
    new Set()
  );

  // Cache state
  const [cachedGeneratedAt, setCachedGeneratedAt] = useState<string | null>(
    null
  );
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  const phaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Service selection handler ─────────────────────────────────────────

  const handleBundleSelect = useCallback(async (bundleId: string) => {
    setSelectedBundleId(bundleId);
    setServiceDetails(null);
    setPlaybook(null);
    setCompletedSections([]);
    setInputCollapsed(false);
    setCachedGeneratedAt(null);
    setShowRegenConfirm(false);

    if (!bundleId) return;

    setDetailsLoading(true);
    try {
      // Fetch service details and cached playbook in parallel
      const [detailsResult, cacheResult] = await Promise.all([
        getServiceDetailsForPlaybook(bundleId),
        getCachedPlaybook(bundleId),
      ]);

      if (detailsResult.success) {
        setServiceDetails(detailsResult.data);
      } else {
        toast.error(detailsResult.error);
      }

      // Load cached playbook if available
      if (cacheResult.success && cacheResult.data) {
        setPlaybook(cacheResult.data.playbook_content as unknown as PlaybookData);
        setCompletedSections([...SECTION_SCHEMA]);
        setCachedGeneratedAt(cacheResult.data.playbook_generated_at);
        setInputCollapsed(true);
      }
    } catch {
      toast.error("Failed to load service details");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // ── Streaming generation ──────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!serviceDetails || !selectedBundleId) return;

    setIsStreaming(true);
    setPlaybook(null);
    setCompletedSections([]);
    setActiveSection("icp");
    setInputCollapsed(true);
    setStreamPhase(0);
    setExpandedObjections(new Set());
    setCachedGeneratedAt(null);
    setShowRegenConfirm(false);

    // Cycle progress messages
    phaseIntervalRef.current = setInterval(() => {
      setStreamPhase((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3000);

    const abort = new AbortController();
    abortRef.current = abort;

    let buffer = "";

    try {
      const res = await fetch("/api/ai/generate-playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundle_id: selectedBundleId,
          org_name: orgName,
          org_target_verticals: orgTargetVerticals,
        }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();

          if (payload === "[DONE]") {
            // Final parse
            const cleaned = buffer
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/, "")
              .trim();
            const finalParsed = tryParsePartialJSON(cleaned);
            if (finalParsed) {
              setPlaybook(finalParsed as unknown as PlaybookData);
              setCompletedSections([...SECTION_SCHEMA]);
              setCachedGeneratedAt(new Date().toISOString());
            }
            continue;
          }

          try {
            const chunk = JSON.parse(payload);
            if (typeof chunk === "string") {
              buffer += chunk;
            } else if (chunk.error) {
              throw new Error(chunk.error);
            }
          } catch {
            // Skip unparseable chunks
            continue;
          }

          // Progressive parse
          const cleaned = buffer
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/, "")
            .trim();
          const parsed = tryParsePartialJSON(cleaned);
          if (parsed) {
            setPlaybook(parsed as unknown as PlaybookData);
            const sections = getCompletedSections(
              parsed,
              SECTION_SCHEMA as unknown as string[]
            );
            setCompletedSections(sections);
            // Auto-navigate to latest completed section
            if (sections.length > 0) {
              setActiveSection(sections[sections.length - 1]);
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(
          err instanceof Error ? err.message : "Playbook generation failed"
        );
      }
    } finally {
      setIsStreaming(false);
      if (phaseIntervalRef.current) {
        clearInterval(phaseIntervalRef.current);
        phaseIntervalRef.current = null;
      }
    }
  }, [serviceDetails, selectedBundleId, orgName, orgTargetVerticals]);

  // ── Regenerate with confirmation ──────────────────────────────────────

  const handleRegenerate = useCallback(() => {
    setShowRegenConfirm(true);
  }, []);

  const handleConfirmRegenerate = useCallback(() => {
    setShowRegenConfirm(false);
    handleGenerate();
  }, [handleGenerate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────

  const canGenerate =
    !!serviceDetails && !!serviceDetails.outcome_statement && !isStreaming;
  const showOutput = playbook !== null || isStreaming;
  const selectedBundle = activeBundles.find((b) => b.id === selectedBundleId);
  const isCachedPlaybook = cachedGeneratedAt !== null && !isStreaming;

  // ── Objection toggle ──────────────────────────────────────────────────

  const toggleObjection = (idx: number) => {
    setExpandedObjections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Section renderers ─────────────────────────────────────────────────

  function renderICPSection() {
    const icp = playbook?.icp;
    if (!icp) return <SectionPlaceholder />;

    return (
      <div className="space-y-5">
        {icp.industries && icp.industries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Target Industries
            </h4>
            <div className="flex flex-wrap gap-2">
              {icp.industries.map((ind) => (
                <Badge key={ind} variant="secondary">
                  {ind}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {icp.company_size && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Company Size
            </h4>
            <p className="text-sm">{icp.company_size}</p>
          </div>
        )}

        {icp.buyer_role && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Buyer Role
            </h4>
            <p className="text-sm">{icp.buyer_role}</p>
          </div>
        )}

        {icp.security_maturity && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Security Maturity
            </h4>
            <p className="text-sm">{icp.security_maturity}</p>
          </div>
        )}

        {icp.buying_triggers && icp.buying_triggers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Buying Triggers
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {icp.buying_triggers.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {icp.qualification_questions &&
          icp.qualification_questions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Qualification Questions
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {icp.qualification_questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}
      </div>
    );
  }

  function renderTalkTrackSection() {
    const tt = playbook?.talk_track;
    if (!tt) return <SectionPlaceholder />;

    return (
      <div className="space-y-5">
        {tt.opening_statement && (
          <TextBlock label="Opening Statement" text={tt.opening_statement} />
        )}
        {tt.problem_statement && (
          <TextBlock label="Problem Statement" text={tt.problem_statement} />
        )}
        {tt.solution_statement && (
          <TextBlock label="Solution Statement" text={tt.solution_statement} />
        )}

        {tt.proof_points && tt.proof_points.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Proof Points
              </h4>
              <button
                type="button"
                onClick={() => copyToClipboard(tt.proof_points!.join("\n"))}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {tt.proof_points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {tt.closing_question && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 className="text-sm font-medium text-primary mb-1">
              Closing Question
            </h4>
            <p className="text-sm font-medium">{tt.closing_question}</p>
          </div>
        )}
      </div>
    );
  }

  function renderObjectionsSection() {
    const objs = playbook?.objections;
    if (!objs || objs.length === 0) return <SectionPlaceholder />;

    return (
      <div className="space-y-3">
        {objs.map((obj, idx) => (
          <Card key={idx}>
            <button
              type="button"
              onClick={() => toggleObjection(idx)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <span className="text-sm font-medium pr-4">
                {obj.objection || `Objection ${idx + 1}`}
              </span>
              {expandedObjections.has(idx) ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </button>
            {expandedObjections.has(idx) && (
              <CardContent className="pt-0 pb-4 px-4 space-y-3">
                {obj.acknowledgment && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">
                      Acknowledgment
                    </h5>
                    <p className="text-sm">{obj.acknowledgment}</p>
                  </div>
                )}
                {obj.response && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">
                      Response
                    </h5>
                    <p className="text-sm">{obj.response}</p>
                  </div>
                )}
                {obj.follow_up_question && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <h5 className="text-xs font-medium text-muted-foreground mb-1">
                      Follow-up Question
                    </h5>
                    <p className="text-sm font-medium">
                      {obj.follow_up_question}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    );
  }

  function renderEmailsSection() {
    const emails = playbook?.emails;
    if (!emails) return <SectionPlaceholder />;

    const emailEntries: { key: string; label: string; email?: PlaybookEmail }[] =
      [
        {
          key: "cold_outreach",
          label: "Cold Outreach",
          email: emails.cold_outreach,
        },
        { key: "follow_up", label: "Follow Up", email: emails.follow_up },
        {
          key: "post_meeting",
          label: "Post Meeting",
          email: emails.post_meeting,
        },
      ];

    return (
      <div className="space-y-4">
        {emailEntries.map(
          ({ key, label, email }) =>
            email && (
              <Card key={key}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{label}</h4>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `Subject: ${email.subject}\n\n${email.body}`
                        )
                      }
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy Email
                    </button>
                  </div>
                  {email.subject && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        Subject:{" "}
                      </span>
                      <span className="text-sm font-medium">
                        {email.subject}
                      </span>
                    </div>
                  )}
                  {email.body && (
                    <textarea
                      readOnly
                      value={email.body}
                      className="w-full min-h-[120px] text-sm bg-muted/30 border border-border rounded-md p-3 resize-y"
                    />
                  )}
                </CardContent>
              </Card>
            )
        )}
      </div>
    );
  }

  function renderCheatSheetSection() {
    const cs = playbook?.cheat_sheet;
    if (!cs) return <SectionPlaceholder />;

    return (
      <div className="space-y-5">
        {cs.one_liner && (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <h4 className="text-xs font-medium text-primary mb-1">
              Elevator Pitch
            </h4>
            <p className="text-base font-medium">{cs.one_liner}</p>
          </div>
        )}

        {cs.top_verticals && cs.top_verticals.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Top Verticals
            </h4>
            <div className="flex flex-wrap gap-2">
              {cs.top_verticals.map((v) => (
                <Badge key={v} variant="secondary">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cs.stack_tools && cs.stack_tools.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Stack (Internal Reference)
            </h4>
            <div className="flex flex-wrap gap-2">
              {cs.stack_tools.map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cs.top_triggers && cs.top_triggers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Top Buying Triggers
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {cs.top_triggers.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {cs.differentiators && cs.differentiators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Key Differentiators
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {cs.differentiators.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}

        {cs.price_anchor && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Pricing Anchor
            </h4>
            <p className="text-sm">{cs.price_anchor}</p>
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => window.print()}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print / Export
        </Button>
      </div>
    );
  }

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    icp: renderICPSection,
    talk_track: renderTalkTrackSection,
    objections: renderObjectionsSection,
    emails: renderEmailsSection,
    cheat_sheet: renderCheatSheetSection,
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Input section */}
      {!inputCollapsed ? (
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Select a Service
              </label>
              <Select
                value={selectedBundleId}
                onValueChange={handleBundleSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a service to build a playbook for..." />
                </SelectTrigger>
                <SelectContent>
                  {activeBundles.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loading state */}
            {detailsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading service details...
              </div>
            )}

            {/* Service summary card */}
            {serviceDetails && !detailsLoading && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {serviceDetails.service_name}
                    </h3>
                    {serviceDetails.outcome_type && (
                      <Badge variant="secondary">
                        {serviceDetails.outcome_type}
                      </Badge>
                    )}
                  </div>

                  {serviceDetails.outcome_statement ? (
                    <p className="text-sm text-muted-foreground">
                      {serviceDetails.outcome_statement}
                    </p>
                  ) : (
                    <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        This service has no outcome statement. Complete the
                        Outcome Layer in the service builder before generating a
                        playbook.
                      </p>
                    </div>
                  )}

                  {serviceDetails.target_vertical && (
                    <p className="text-xs text-muted-foreground">
                      Vertical: {serviceDetails.target_vertical}
                      {serviceDetails.target_persona &&
                        ` · Persona: ${serviceDetails.target_persona}`}
                    </p>
                  )}

                  {serviceDetails.assigned_tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {serviceDetails.assigned_tools.map((t) => (
                        <Badge
                          key={t.name}
                          variant="outline"
                          className="text-xs"
                        >
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Generate button — only when no cached playbook */}
            {serviceDetails && !detailsLoading && (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                Build Playbook
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Collapsed summary bar */
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedBundle?.name ?? "Playbook"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isStreaming
                  ? `${completedSections.length} / ${SECTION_SCHEMA.length} sections — generating...`
                  : `${completedSections.length} / ${SECTION_SCHEMA.length} sections complete`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isCachedPlaybook && cachedGeneratedAt && (
              <span className="text-xs text-muted-foreground">
                Generated {formatRelativeDate(cachedGeneratedAt)}
              </span>
            )}
            {isCachedPlaybook && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                className="gap-1.5 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                setInputCollapsed(false);
                setPlaybook(null);
                setCompletedSections([]);
                setIsStreaming(false);
                setCachedGeneratedAt(null);
                abortRef.current?.abort();
              }}
              className="text-sm text-primary hover:underline"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Regeneration confirmation */}
      {showRegenConfirm && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
          <p className="text-sm text-foreground">
            This will replace your existing playbook. Continue?
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegenConfirm(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmRegenerate}>
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Streaming progress */}
      {isStreaming && !playbook && (
        <div className="flex items-center gap-3 px-2 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground animate-pulse">
            {PROGRESS_MESSAGES[streamPhase]}
          </span>
        </div>
      )}

      {/* Playbook output: sidebar + content */}
      {showOutput && (
        <div className="grid grid-cols-[220px_1fr] gap-4">
          {/* Sidebar */}
          <nav className="space-y-1">
            {SECTION_SCHEMA.map((key) => {
              const Icon = SECTION_ICONS[key];
              const isCompleted = completedSections.includes(key);
              const isActive = activeSection === key;
              const hasContent = playbook && key in playbook;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : hasContent
                        ? "text-foreground hover:bg-muted/50"
                        : "text-muted-foreground/50 cursor-default"
                  )}
                  disabled={!hasContent && !isStreaming}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Icon className="h-4 w-4 shrink-0" />
                  )}
                  {SECTION_LABELS[key]}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-semibold mb-4">
                {SECTION_LABELS[activeSection]}
              </h3>
              {sectionRenderers[activeSection]?.() ?? <SectionPlaceholder />}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print-only CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .sales-enablement-print,
          .sales-enablement-print * {
            visibility: visible;
          }
        }
      `}</style>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionPlaceholder() {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Generating this section...
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
        <button
          type="button"
          onClick={() => copyToClipboard(text)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
