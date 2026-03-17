"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { BUNDLE_TYPE_LABELS } from "@/lib/constants";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  Loader2,
  Layers,
  Star,
} from "lucide-react";
import {
  createTierPackageAction,
  saveTierPackageItemsAction,
} from "@/actions/tier-packages";
import type { BundleType } from "@/lib/types";

interface ActiveBundle {
  id: string;
  name: string;
  bundle_type: BundleType;
  latest_mrr: number | null;
}

interface NewPackageWizardProps {
  activeBundles: ActiveBundle[];
}

interface TierItem {
  bundle_id: string;
  tier_label: string;
  highlight: boolean;
}

const STEP_LABELS = ["Package Info", "Select Tiers", "Configure"];

const DEFAULT_TIER_LABELS = ["Essential", "Professional", "Enterprise"];

export function NewPackageWizard({ activeBundles }: NewPackageWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);

  // Step 1: Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Select services
  const [selectedBundles, setSelectedBundles] = useState<string[]>([]);

  // Step 3: Configure tiers
  const [tierItems, setTierItems] = useState<TierItem[]>([]);

  function handleBundleToggle(bundleId: string) {
    setSelectedBundles((prev) =>
      prev.includes(bundleId)
        ? prev.filter((id) => id !== bundleId)
        : [...prev, bundleId]
    );
  }

  function handleNextToStep2() {
    if (!name.trim()) {
      toast.error("Package name is required");
      return;
    }
    setStep(1);
  }

  function handleNextToStep3() {
    if (selectedBundles.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    // Initialize tier items with defaults
    const items: TierItem[] = selectedBundles.map((bundleId, idx) => ({
      bundle_id: bundleId,
      tier_label: DEFAULT_TIER_LABELS[idx] ?? `Tier ${idx + 1}`,
      highlight: idx === 1, // middle tier highlighted by default
    }));
    setTierItems(items);
    setStep(2);
  }

  function updateTierLabel(index: number, label: string) {
    setTierItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, tier_label: label } : item))
    );
  }

  function toggleHighlight(index: number) {
    setTierItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, highlight: !item.highlight } : item))
    );
  }

  function handleCreate() {
    startTransition(async () => {
      // Create package
      const createResult = await createTierPackageAction({
        name: name.trim(),
        description: description.trim(),
      });

      if (!createResult.success) {
        toast.error(createResult.error);
        return;
      }

      const packageId = createResult.data.id;

      // Save items
      const itemsResult = await saveTierPackageItemsAction(
        packageId,
        tierItems.map((item, idx) => ({
          bundle_id: item.bundle_id,
          tier_label: item.tier_label,
          sort_order: idx,
          highlight: item.highlight,
        }))
      );

      if (!itemsResult.success) {
        toast.error(itemsResult.error);
        return;
      }

      toast.success("Package created");
      router.push(`/packages/${packageId}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step > 0 ? setStep(step - 1) : router.push("/packages"))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            New Package
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Step {step + 1} of 3 — {STEP_LABELS[step]}
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8",
                  i < step ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        A package combines multiple services into a single offering your clients
        can subscribe to. Create 2&ndash;4 tiers (e.g. Good / Better / Best) to give
        clients options at different price points.
      </p>

      {/* Step content */}
      {step === 0 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name</Label>
              <Input
                id="name"
                placeholder="e.g. Core Security Tiers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this package..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleNextToStep2} className="gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Select services to include as tiers
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose 2-4 services. Each becomes a tier in your package (e.g.
                Essential → Professional → Enterprise).
              </p>
            </div>

            {activeBundles.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active services found. Build a service first.
              </div>
            ) : (
              <div className="space-y-2">
                {activeBundles.map((bundle) => {
                  const selected = selectedBundles.includes(bundle.id);
                  return (
                    <button
                      key={bundle.id}
                      type="button"
                      onClick={() => handleBundleToggle(bundle.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                        selected
                          ? "border-primary/30 bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded flex items-center justify-center border transition-colors flex-shrink-0",
                          selected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {bundle.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {BUNDLE_TYPE_LABELS[bundle.bundle_type]}
                          </Badge>
                        </div>
                        {bundle.latest_mrr != null && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(bundle.latest_mrr)}/mo
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNextToStep3}
                disabled={selectedBundles.length === 0}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Configure tier labels
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Name each tier and optionally highlight the recommended one.
                Order from lowest to highest.
              </p>
            </div>

            <div className="space-y-3">
              {tierItems.map((item, idx) => {
                const bundle = activeBundles.find(
                  (b) => b.id === item.bundle_id
                );
                return (
                  <div
                    key={item.bundle_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      item.highlight
                        ? "border-primary/30 bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.tier_label}
                          onChange={(e) => updateTierLabel(idx, e.target.value)}
                          className="h-8 text-sm max-w-[200px]"
                          placeholder="Tier name"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          → {bundle?.name ?? "Unknown"}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 flex-shrink-0",
                        item.highlight && "text-primary"
                      )}
                      onClick={() => toggleHighlight(idx)}
                      title={
                        item.highlight ? "Remove highlight" : "Highlight tier"
                      }
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          item.highlight && "fill-current"
                        )}
                      />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isPending || tierItems.some((t) => !t.tier_label.trim())}
                className="gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Layers className="h-4 w-4" />
                    Create Package
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
