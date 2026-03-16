"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import {
  Loader2,
  Download,
  FileText,
  ArrowRight,
  Trash2,
  Eye,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BriefOutputDisplay } from "@/components/fractional-cto/brief-output";
import { RiskSummary } from "@/components/fractional-cto/risk-summary";
import {
  generateCTOBrief,
  exportBriefPdfAction,
  exportBriefDocxAction,
  saveCTOBrief,
  deleteCTOBrief,
} from "@/actions/fractional-cto";
import type {
  BriefOutput,
  CTOBriefRecord,
  BriefSections,
} from "@/types/fractional-cto";

// ── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Healthcare",
  "Financial Services",
  "Legal",
  "Manufacturing",
  "Professional Services",
  "Retail",
  "Education",
  "Government",
  "Technology",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1\u201350 employees",
  "51\u2013200 employees",
  "201\u2013500 employees",
  "500+ employees",
] as const;

const CONCERNS = [
  "Cybersecurity Risk",
  "AI & Automation",
  "Compliance & Governance",
  "Operational Resilience",
  "Digital Transformation",
] as const;

const PROGRESS_MESSAGES = [
  "Analyzing technology signals for {domain}...",
  "Assessing industry risk landscape...",
  "Building technology radar...",
  "Preparing your executive brief...",
] as const;

// ── Props ────────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  name: string;
  industry: string;
  contactEmail: string;
}

interface FractionalCTOClientProps {
  clients: ClientOption[];
  briefs: CTOBriefRecord[];
  mspName: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function currentQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ────────────────────────────────────────────────────────────────

type Mode = "generate" | "view";

export function FractionalCTOClient({
  clients,
  briefs: initialBriefs,
  mspName: initialMspName,
}: FractionalCTOClientProps) {
  // Mode state
  const [mode, setMode] = useState<Mode>("generate");
  const [viewingBrief, setViewingBrief] = useState<CTOBriefRecord | null>(null);
  const [briefs, setBriefs] = useState(initialBriefs);
  const [viewTab, setViewTab] = useState<"full" | "risks">("full");

  // Form state
  const [clientId, setClientId] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [concern, setConcern] = useState("");
  const [mspName, setMspName] = useState(initialMspName);
  const [quarterLabel, setQuarterLabel] = useState(currentQuarterLabel());

  // Generation state
  const [isPending, startTransition] = useTransition();
  const [generatedBrief, setGeneratedBrief] = useState<BriefOutput | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  // Save / export state
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Refs
  const resultRef = useRef<HTMLDivElement>(null);

  // Progress rotation
  useEffect(() => {
    if (!isPending) return;
    setProgressIdx(0);
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPending]);

  // Scroll to result
  useEffect(() => {
    if (generatedBrief && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [generatedBrief]);

  // Auto-fill from client selection
  function handleClientChange(id: string) {
    setClientId(id);
    if (id) {
      const client = clients.find((c) => c.id === id);
      if (client) {
        setIndustry(client.industry || "");
        // Extract domain from email if available
        if (client.contactEmail) {
          const emailDomain = client.contactEmail.split("@")[1];
          if (emailDomain) setDomain(emailDomain);
        }
      }
    }
  }

  const canSubmit =
    domain.trim().length > 0 &&
    industry.length > 0 &&
    companySize.length > 0 &&
    mspName.trim().length > 0;

  function handleGenerate() {
    if (!canSubmit) return;
    setError(null);
    setGeneratedBrief(null);

    startTransition(async () => {
      try {
        const result = await generateCTOBrief({
          domain: domain.trim(),
          industry,
          companySize,
          primaryConcern: concern || undefined,
          mspName: mspName.trim(),
        });
        setGeneratedBrief(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate brief. Please try again.",
        );
      }
    });
  }

  async function handleSave() {
    if (!generatedBrief) return;
    setSaving(true);
    setError(null);
    try {
      const { id } = await saveCTOBrief({
        clientId: clientId || undefined,
        domain: generatedBrief.clientDomain,
        industry: generatedBrief.industry,
        companySize,
        primaryConcern: concern || undefined,
        mspName: generatedBrief.mspName,
        quarterLabel,
        briefJson: generatedBrief.sections,
      });

      // Add to local list
      const clientName =
        clients.find((c) => c.id === clientId)?.name ?? null;
      setBriefs((prev) => [
        {
          id,
          clientId: clientId || null,
          clientName,
          domain: generatedBrief.clientDomain,
          industry: generatedBrief.industry,
          companySize,
          primaryConcern: concern || null,
          mspName: generatedBrief.mspName,
          quarterLabel,
          briefJson: generatedBrief.sections,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      // Switch to view the saved brief
      setGeneratedBrief(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save brief.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    try {
      await deleteCTOBrief(id);
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      if (viewingBrief?.id === id) {
        setViewingBrief(null);
        setMode("generate");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete brief.",
      );
    } finally {
      setDeleting(null);
    }
  }

  function handleView(brief: CTOBriefRecord) {
    setViewingBrief(brief);
    setMode("view");
    setViewTab("full");
    setGeneratedBrief(null);
  }

  function handleBackToGenerate() {
    setMode("generate");
    setViewingBrief(null);
  }

  // Build a BriefOutput from a record for display/export
  function recordToBriefOutput(record: CTOBriefRecord): BriefOutput {
    return {
      mspName: record.mspName,
      clientDomain: record.domain,
      industry: record.industry,
      generatedAt: record.createdAt,
      sections: record.briefJson,
    };
  }

  async function handleExportPdf(brief: BriefOutput) {
    setExportingPdf(true);
    try {
      const { base64, filename } = await exportBriefPdfAction(brief);
      downloadBase64(base64, filename, "application/pdf");
    } catch {
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportDocx(brief: BriefOutput) {
    setExportingDocx(true);
    try {
      const { base64, filename } = await exportBriefDocxAction(brief);
      downloadBase64(
        base64,
        filename,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    } catch {
      setError("Failed to generate document. Please try again.");
    } finally {
      setExportingDocx(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeBrief =
    mode === "view" && viewingBrief
      ? recordToBriefOutput(viewingBrief)
      : generatedBrief;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Left: Form or Brief Output ─────────────────────────────────── */}
        <div className="space-y-6">
          {mode === "generate" && !generatedBrief && (
            <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Generate Brief
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a client or enter details manually.
                </p>
              </div>

              {/* Client Selector */}
              {clients.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Client</Label>
                  <Select
                    value={clientId}
                    onValueChange={handleClientChange}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional — select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Client Domain *</Label>
                <Input
                  id="domain"
                  placeholder="acmecorp.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Industry */}
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select
                  value={industry}
                  onValueChange={setIndustry}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Size */}
              <div className="space-y-2">
                <Label>Company Size *</Label>
                <Select
                  value={companySize}
                  onValueChange={setCompanySize}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Primary Concern */}
              <div className="space-y-2">
                <Label>Primary Technology Concern</Label>
                <Select
                  value={concern}
                  onValueChange={setConcern}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCERNS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* MSP Name */}
              <div className="space-y-2">
                <Label htmlFor="mspName">Your Company Name (MSP) *</Label>
                <Input
                  id="mspName"
                  placeholder="Your MSP Name"
                  value={mspName}
                  onChange={(e) => setMspName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Quarter Label */}
              <div className="space-y-2">
                <Label htmlFor="quarter">Quarter Label</Label>
                <Input
                  id="quarter"
                  placeholder="Q1 2026"
                  value={quarterLabel}
                  onChange={(e) => setQuarterLabel(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleGenerate}
                disabled={!canSubmit || isPending}
                className="w-full"
                size="lg"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Technology Strategy Brief
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Progress */}
              {isPending && (
                <div className="text-center">
                  <p className="text-sm text-primary/80 animate-pulse">
                    {PROGRESS_MESSAGES[progressIdx].replace(
                      "{domain}",
                      domain.trim() || "client",
                    )}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Generated brief (unsaved) */}
          {mode === "generate" && generatedBrief && (
            <div ref={resultRef} className="space-y-4 scroll-mt-20">
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                {/* Actions bar */}
                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border/50 flex-wrap">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    Save Brief
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPdf(generatedBrief)}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportDocx(generatedBrief)}
                    disabled={exportingDocx}
                  >
                    {exportingDocx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Download DOCX
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGeneratedBrief(null)}
                  >
                    New Brief
                  </Button>
                </div>

                <BriefOutputDisplay brief={generatedBrief} />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* View saved brief */}
          {mode === "view" && viewingBrief && activeBrief && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/50 flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToGenerate}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Brief
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPdf(activeBrief)}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportDocx(activeBrief)}
                    disabled={exportingDocx}
                  >
                    {exportingDocx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    Download DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(viewingBrief.id)}
                    disabled={deleting === viewingBrief.id}
                  >
                    {deleting === viewingBrief.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </div>

                {/* View toggle: Full Brief / Risk Summary */}
                <div className="flex items-center gap-1 mb-6 rounded-lg bg-muted/50 p-1 w-fit">
                  <button
                    type="button"
                    onClick={() => setViewTab("full")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewTab === "full"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Full Brief
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("risks")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      viewTab === "risks"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Risk Summary
                  </button>
                </div>

                {viewTab === "full" ? (
                  <BriefOutputDisplay brief={activeBrief} />
                ) : (
                  <RiskSummary
                    risks={activeBrief.sections.technologyRisks}
                    clientDomain={activeBrief.clientDomain}
                    mspName={activeBrief.mspName}
                    quarterLabel={viewingBrief.quarterLabel}
                  />
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: History Panel ─────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-5 h-fit lg:sticky lg:top-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Saved Briefs
            </h3>
            <span className="text-xs text-muted-foreground">
              {briefs.length} {briefs.length === 1 ? "brief" : "briefs"}
            </span>
          </div>

          {briefs.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 py-4 text-center">
              No saved briefs yet. Generate and save your first brief.
            </p>
          ) : (
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {briefs.map((brief) => (
                <button
                  key={brief.id}
                  type="button"
                  onClick={() => handleView(brief)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    viewingBrief?.id === brief.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {brief.clientName ?? brief.domain}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground/60">
                          {brief.quarterLabel} &middot;{" "}
                          {formatDate(brief.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
