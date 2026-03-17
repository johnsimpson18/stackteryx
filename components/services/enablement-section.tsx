"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Sparkles, Megaphone } from "lucide-react";
import { saveEnablementAction } from "@/actions/enablement";
import type { BundleEnablement } from "@/lib/types";

interface EnablementSectionProps {
  enablement: BundleEnablement | null;
  latestVersionId: string | null;
  bundleId: string;
}

const SECTIONS = [
  { key: "service_overview", label: "Service Overview" },
  { key: "whats_included", label: "What's Included" },
  { key: "talking_points", label: "Talking Points" },
  { key: "pricing_narrative", label: "Pricing Narrative" },
  { key: "why_us", label: "Why Us" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export function EnablementSection({
  enablement,
  latestVersionId,
  bundleId,
}: EnablementSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [content, setContent] = useState<Record<SectionKey, string>>({
    service_overview: enablement?.service_overview ?? "",
    whats_included: enablement?.whats_included ?? "",
    talking_points: enablement?.talking_points ?? "",
    pricing_narrative: enablement?.pricing_narrative ?? "",
    why_us: enablement?.why_us ?? "",
  });

  const hasContent = SECTIONS.some((s) => content[s.key].trim());

  function updateField(key: SectionKey, value: string) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function handleGenerate() {
    if (!latestVersionId) {
      toast.error("Create a pricing configuration first");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-enablement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle_id: bundleId }),
      });
      if (res.status === 422) {
        const err = await res.json();
        const items = (err.missing as string[]) ?? [];
        toast.error(
          items.length > 0
            ? `Add ${items.join(" and ").toLowerCase()} before generating`
            : "Insufficient context to generate content"
        );
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setContent({
          service_overview: data.service_overview ?? "",
          whats_included: data.whats_included ?? "",
          talking_points: data.talking_points ?? "",
          pricing_narrative: data.pricing_narrative ?? "",
          why_us: data.why_us ?? "",
        });
        setEditing(true);
        toast.success("Content generated — review and save");
      } else {
        toast.error("Failed to generate content");
      }
    } catch {
      toast.error("Failed to generate content");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    if (!latestVersionId) {
      toast.error("Create a pricing configuration first");
      return;
    }
    startTransition(async () => {
      const result = await saveEnablementAction({
        bundle_version_id: latestVersionId,
        ...content,
      });
      if (result.success) {
        toast.success("Sales materials saved");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Empty state ──────────────────────────────────────────────
  if (!hasContent && !editing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No sales enablement content
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Generate talking points, value propositions, and pricing narratives
            to help your team sell this service.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={handleGenerate}
            disabled={aiLoading || !latestVersionId}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Generate Sales Content
          </Button>
          {!latestVersionId && (
            <p className="text-xs text-muted-foreground mt-2">
              A pricing configuration is required before generating content.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Content view / edit ──────────────────────────────────────
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">Sales Materials</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1.5"
            onClick={handleGenerate}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Regenerate
          </Button>
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  setContent({
                    service_overview: enablement?.service_overview ?? "",
                    whats_included: enablement?.whats_included ?? "",
                    talking_points: enablement?.talking_points ?? "",
                    pricing_narrative: enablement?.pricing_narrative ?? "",
                    why_us: enablement?.why_us ?? "",
                  });
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {SECTIONS.map((section) => (
          <div key={section.key} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {section.label}
            </Label>
            {editing ? (
              <Textarea
                value={content[section.key]}
                onChange={(e) => updateField(section.key, e.target.value)}
                rows={4}
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {content[section.key] || (
                  <span className="text-muted-foreground italic">
                    Not yet defined
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
        {enablement?.generated_at && !editing && (
          <p className="text-xs text-muted-foreground pt-2">
            Last generated{" "}
            {new Date(enablement.generated_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
