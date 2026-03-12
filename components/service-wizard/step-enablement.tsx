"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface StepEnablementProps {
  bundleId: string | null;
  serviceOverview: string;
  whatsIncluded: string;
  talkingPoints: string;
  pricingNarrative: string;
  whyUs: string;
  onServiceOverviewChange: (v: string) => void;
  onWhatsIncludedChange: (v: string) => void;
  onTalkingPointsChange: (v: string) => void;
  onPricingNarrativeChange: (v: string) => void;
  onWhyUsChange: (v: string) => void;
}

export function StepEnablement({
  bundleId,
  serviceOverview,
  whatsIncluded,
  talkingPoints,
  pricingNarrative,
  whyUs,
  onServiceOverviewChange,
  onWhatsIncludedChange,
  onTalkingPointsChange,
  onPricingNarrativeChange,
  onWhyUsChange,
}: StepEnablementProps) {
  const [aiLoading, setAiLoading] = useState(false);

  async function handleGenerateEnablement() {
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
            : "Insufficient context to generate enablement"
        );
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.service_overview) onServiceOverviewChange(data.service_overview);
        if (data.whats_included) onWhatsIncludedChange(data.whats_included);
        if (data.talking_points) onTalkingPointsChange(data.talking_points);
        if (data.pricing_narrative) onPricingNarrativeChange(data.pricing_narrative);
        if (data.why_us) onWhyUsChange(data.why_us);
      } else {
        toast.error("Failed to generate enablement content");
      }
    } catch {
      toast.error("Failed to generate enablement content");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales Enablement</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create content your team needs to sell this service effectively.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerateEnablement}
          disabled={aiLoading}
          className="h-8 text-xs gap-1.5 shrink-0"
        >
          {aiLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generate Enablement
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service-overview">Service overview</Label>
          <Textarea
            id="service-overview"
            placeholder="A high-level description of what this service does and who it's for..."
            value={serviceOverview}
            onChange={(e) => onServiceOverviewChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whats-included">What&apos;s included</Label>
          <Textarea
            id="whats-included"
            placeholder="List of tools, features, and deliverables included in this service..."
            value={whatsIncluded}
            onChange={(e) => onWhatsIncludedChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="talking-points">Talking points</Label>
          <Textarea
            id="talking-points"
            placeholder="Key messages for sales conversations..."
            value={talkingPoints}
            onChange={(e) => onTalkingPointsChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricing-narrative">Pricing narrative</Label>
          <Textarea
            id="pricing-narrative"
            placeholder="How to explain the pricing to prospects..."
            value={pricingNarrative}
            onChange={(e) => onPricingNarrativeChange(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="why-us">Why us</Label>
          <Textarea
            id="why-us"
            placeholder="Differentiators and competitive advantages..."
            value={whyUs}
            onChange={(e) => onWhyUsChange(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
