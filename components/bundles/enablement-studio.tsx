"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  RefreshCw,
  FileText,
  FileDown,
  List,
  MessageSquare,
  DollarSign,
  Shield,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  saveEnablementAction,
  exportEnablementPdfAction,
  exportEnablementDocxAction,
} from "@/actions/enablement";
import { toast } from "sonner";
import type { EnablementContent } from "@/lib/types";

// ── Section metadata ─────────────────────────────────────────────────────────

type SectionKey = keyof EnablementContent;

const SECTIONS: {
  key: SectionKey;
  label: string;
  icon: typeof FileText;
}[] = [
  { key: "service_overview", label: "Service Overview", icon: FileText },
  { key: "whats_included", label: "What's Included", icon: List },
  { key: "talking_points", label: "Talking Points", icon: MessageSquare },
  { key: "pricing_narrative", label: "Pricing Narrative", icon: DollarSign },
  { key: "why_us", label: "Why Us", icon: Shield },
];

const EMPTY_CONTENT: EnablementContent = {
  service_overview: "",
  whats_included: "",
  talking_points: "",
  pricing_narrative: "",
  why_us: "",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface EnablementStudioProps {
  bundleVersionId: string;
  initialContent: EnablementContent | null;
  generatedAt: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export function EnablementStudio({
  bundleVersionId,
  initialContent,
  generatedAt,
}: EnablementStudioProps) {
  const router = useRouter();
  const [content, setContent] = useState<EnablementContent>(
    initialContent ?? EMPTY_CONTENT
  );
  const [activeSection, setActiveSection] = useState<SectionKey>(
    "service_overview"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<SectionKey | null>(
    null
  );
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasContent = Object.values(content).some((v) => v.length > 0);

  // Warn on navigation if dirty
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // ── Generate all sections ──────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingSection(null);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/generate-enablement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle_version_id: bundleVersionId }),
        signal: abortRef.current.signal,
      });

      if (response.status === 422) {
        const err = await response.json().catch(() => ({}));
        const items = (err.missing as string[]) ?? [];
        toast.error(
          items.length > 0
            ? `Add ${items.join(" and ").toLowerCase()} before generating`
            : "Insufficient context to generate enablement"
        );
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to generate");
        setIsGenerating(false);
        return;
      }

      const data = await response.json();

      // Update sections one by one for visual feedback
      for (const section of SECTIONS) {
        if (data[section.key]) {
          setContent((prev) => ({ ...prev, [section.key]: data[section.key] }));
          setActiveSection(section.key);
          setGeneratingSection(section.key);
        }
      }

      setIsDirty(true);
      setGeneratingSection(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
    }
  }, [bundleVersionId]);

  // ── Regenerate single section ──────────────────────────────────────────

  const handleRegenerateSection = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingSection(activeSection);
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai/generate-enablement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle_version_id: bundleVersionId }),
        signal: abortRef.current.signal,
      });

      if (response.status === 422) {
        const err = await response.json().catch(() => ({}));
        const items = (err.missing as string[]) ?? [];
        toast.error(
          items.length > 0
            ? `Add ${items.join(" and ").toLowerCase()} before generating`
            : "Insufficient context to generate enablement"
        );
        setIsGenerating(false);
        setGeneratingSection(null);
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to regenerate");
        setIsGenerating(false);
        setGeneratingSection(null);
        return;
      }

      const data = await response.json();

      // Only update the active section
      if (data[activeSection]) {
        setContent((prev) => ({ ...prev, [activeSection]: data[activeSection] }));
      }

      setIsDirty(true);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Regeneration failed");
    } finally {
      setIsGenerating(false);
      setGeneratingSection(null);
    }
  }, [bundleVersionId, activeSection]);

  // ── Save ───────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const result = await saveEnablementAction({
      bundle_version_id: bundleVersionId,
      ...content,
    });

    if (result.success) {
      toast.success("Enablement content saved");
      setIsDirty(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSaving(false);
  }, [bundleVersionId, content, router]);

  // ── Export helpers ─────────────────────────────────────────────────────

  function triggerDownload(base64: string, filename: string, mime: string) {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const result = await exportEnablementPdfAction(bundleVersionId);
      if (result.success) {
        triggerDownload(result.data.base64, result.data.filename, "application/pdf");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }, [bundleVersionId]);

  const handleExportDocx = useCallback(async () => {
    setIsExportingDocx(true);
    try {
      const result = await exportEnablementDocxAction(bundleVersionId);
      if (result.success) {
        triggerDownload(
          result.data.base64,
          result.data.filename,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to export document");
    } finally {
      setIsExportingDocx(false);
    }
  }, [bundleVersionId]);

  // ── Update section content ─────────────────────────────────────────────

  function updateSection(value: string) {
    setContent((prev) => ({ ...prev, [activeSection]: value }));
    setIsDirty(true);
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (!hasContent && !isGenerating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Sales Enablement Package
          </h3>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
            Generate a complete sales enablement package for this bundle version.
            AI will create a service overview, tool breakdown, talking points,
            pricing narrative, and competitive positioning.
          </p>
          <Button className="mt-6" onClick={handleGenerate}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────

  const activeMeta = SECTIONS.find((s) => s.key === activeSection)!;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {generatedAt
            ? `Last generated: ${new Date(generatedAt).toLocaleDateString()} ${new Date(generatedAt).toLocaleTimeString()}`
            : "Not yet generated"}
          {isDirty && (
            <span className="ml-2 text-amber-500 font-medium">
              (unsaved changes)
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            {isGenerating ? "Generating..." : "Generate with AI"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!hasContent || isGenerating || isExportingPdf}
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDocx}
            disabled={!hasContent || isGenerating || isExportingDocx}
          >
            {isExportingDocx ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-1.5" />
            )}
            Export Word
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isGenerating || isSaving || !isDirty}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Section nav + editor */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Section nav */}
        <nav className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            const hasValue = content[section.key].length > 0;
            const isPulsing =
              isGenerating && generatingSection === section.key;

            return (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-left transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isPulsing && "animate-pulse"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="truncate">{section.label}</span>
                {hasValue && !isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {activeMeta.label}
            </h3>
            {hasContent && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleRegenerateSection}
                disabled={isGenerating || isSaving}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5 mr-1",
                    isGenerating &&
                      generatingSection === activeSection &&
                      "animate-spin"
                  )}
                />
                Regenerate this section
              </Button>
            )}
          </div>
          <Textarea
            value={content[activeSection]}
            onChange={(e) => updateSection(e.target.value)}
            placeholder={`Write or generate ${activeMeta.label.toLowerCase()}...`}
            className="min-h-[400px] resize-y font-mono text-sm leading-relaxed"
            disabled={isGenerating}
          />
        </div>
      </div>
    </div>
  );
}
