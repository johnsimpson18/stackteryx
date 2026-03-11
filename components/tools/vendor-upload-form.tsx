"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  Zap,
  TrendingUp,
  AlertCircle,
  Info,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calculatePricing } from "@/lib/pricing/engine";
import { createToolAction } from "@/actions/tools";
import {
  CATEGORY_LABELS,
  PRICING_MODEL_LABELS,
  TOOL_CATEGORIES,
} from "@/lib/constants";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import type { Tool, PricingToolInput } from "@/lib/types";
import type { OrgSettings } from "@/lib/db/org-settings";
import type { ExtractionResult } from "@/app/api/extract-vendor-pricing/route";

interface VendorUploadFormProps {
  existingTools: Tool[];
  settings: OrgSettings | null;
}

type UploadStep = "idle" | "uploading" | "extracted" | "saving";

const CONFIDENCE_COLORS = {
  high: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  low: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const CONFIDENCE_LABELS = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence — please review carefully",
};

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-400";
  if (margin >= 0.15) return "text-amber-400";
  return "text-red-400";
}

export function VendorUploadForm({
  existingTools,
  settings,
}: VendorUploadFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable extraction fields
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState<ExtractionResult["category"]>("other");
  const [pricingModel, setPricingModel] = useState<ExtractionResult["pricing_model"]>("per_seat");
  const [perSeatCost, setPerSeatCost] = useState(0);
  const [flatMonthlyCost, setFlatMonthlyCost] = useState(0);
  const [vendorMinimum, setVendorMinimum] = useState<number | null>(null);
  const [supportComplexity, setSupportComplexity] = useState(3);
  const [renewalUplift, setRenewalUplift] = useState(0.03);

  // Margin preview
  const [seatCount, setSeatCount] = useState(25);

  function populateForm(data: ExtractionResult) {
    setName(data.name);
    setVendor(data.vendor);
    setCategory(data.category as ExtractionResult["category"]);
    setPricingModel(data.pricing_model);
    setPerSeatCost(data.per_seat_cost);
    setFlatMonthlyCost(data.flat_monthly_cost);
    setVendorMinimum(data.vendor_minimum_monthly);
    setSupportComplexity(data.support_complexity);
    setRenewalUplift(data.renewal_uplift_pct);
  }

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.toLowerCase();
    if (
      !ext.endsWith(".pdf") &&
      !ext.endsWith(".csv") &&
      !ext.endsWith(".txt") &&
      file.type !== "application/pdf" &&
      !file.type.includes("csv") &&
      !file.type.includes("text")
    ) {
      setError("Please upload a PDF or CSV file.");
      return;
    }

    setSelectedFile(file);
    setStep("uploading");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-vendor-pricing", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Extraction failed.");
        setStep("idle");
        return;
      }

      const data = json.extracted as ExtractionResult;
      setExtracted(data);
      populateForm(data);
      setStep("extracted");
    } catch {
      setError("Network error. Please try again.");
      setStep("idle");
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // Stack fit analysis
  const overlappingTools = existingTools.filter(
    (t) => t.is_active && t.category === category
  );
  const existingCategories = new Set(
    existingTools.filter((t) => t.is_active).map((t) => t.category)
  );
  const isNewCategory = !existingCategories.has(category as Tool["category"]);

  // Live margin preview using pricing engine
  const pricingTool: PricingToolInput = {
    id: "preview",
    name: name || "New Tool",
    pricing_model: pricingModel,
    per_seat_cost: perSeatCost,
    flat_monthly_cost: flatMonthlyCost,
    tier_rules: extracted?.tier_rules ?? [],
    vendor_minimum_monthly: vendorMinimum,
    labor_cost_per_seat: null,
    quantity_multiplier: 1,
  };

  const defaultOverhead = settings?.default_overhead_pct ?? 0.1;
  const defaultLabor = settings?.default_labor_pct ?? 0.15;
  const defaultMargin = settings?.default_target_margin_pct ?? 0.35;
  const redZone = settings?.red_zone_margin_pct ?? 0.15;
  const maxDiscount = settings?.max_discount_no_approval_pct ?? 0.1;

  const pricing =
    step === "extracted"
      ? calculatePricing({
          tools: [pricingTool],
          seat_count: seatCount,
          target_margin_pct: defaultMargin,
          overhead_pct: defaultOverhead,
          labor_pct: defaultLabor,
          discount_pct: 0,
          red_zone_margin_pct: redZone,
          max_discount_no_approval_pct: maxDiscount,
          contract_term_months: 12,
        })
      : null;

  async function handleSave() {
    startTransition(async () => {
      const toolData = {
        name,
        vendor,
        category: category as Tool["category"],
        pricing_model: pricingModel,
        per_seat_cost: perSeatCost,
        flat_monthly_cost: flatMonthlyCost,
        tier_rules: extracted?.tier_rules ?? [],
        vendor_minimum_monthly: vendorMinimum,
        labor_cost_per_seat: null,
        support_complexity: supportComplexity,
        renewal_uplift_pct: renewalUplift,
      };

      const result = await createToolAction(toolData);
      if (result.success) {
        toast.success(`"${name}" added to your tool catalog`);
        router.push("/stack-catalog");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      {(step === "idle" || step === "uploading") && (
        <Card>
          <CardContent className="p-0">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => step === "idle" && fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 text-center transition-all",
                step === "idle"
                  ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                  : "cursor-default",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-border",
                step === "uploading" && "opacity-60"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt"
                className="hidden"
                onChange={onFileChange}
                disabled={step === "uploading"}
              />

              {step === "uploading" ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
                    <Zap className="h-7 w-7 animate-pulse text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Analyzing with Claude AI...
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Extracting pricing from{" "}
                      <span className="font-medium">{selectedFile?.name}</span>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Drop a vendor pricing document here
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse · PDF or CSV · up to 10MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Vendor quote sheets, price lists, rate cards
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border bg-red-500/10 border-red-500/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Extraction failed</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === "extracted" && extracted && (
        <>
          {/* File + confidence header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{selectedFile?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  CONFIDENCE_COLORS[extracted.confidence]
                )}
              >
                {CONFIDENCE_LABELS[extracted.confidence]}
              </Badge>
              <button
                onClick={() => {
                  setStep("idle");
                  setExtracted(null);
                  setSelectedFile(null);
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Claude's notes */}
          {extracted.notes && (
            <div className="flex items-start gap-2 rounded-lg border bg-blue-500/10 border-blue-500/20 px-4 py-3">
              <Info className="h-4 w-4 flex-shrink-0 text-blue-400 mt-0.5" />
              <p className="text-xs text-blue-400">{extracted.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Extracted & editable fields */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Extracted Pricing — Review & Edit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tool Name</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="text-sm"
                        placeholder="Product name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vendor</Label>
                      <Input
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        className="text-sm"
                        placeholder="Vendor name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={category}
                        onValueChange={(v) =>
                          setCategory(v as ExtractionResult["category"])
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOOL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pricing Model</Label>
                      <Select
                        value={pricingModel}
                        onValueChange={(v) =>
                          setPricingModel(
                            v as ExtractionResult["pricing_model"]
                          )
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            ["per_seat", "flat_monthly", "tiered"] as const
                          ).map((m) => (
                            <SelectItem key={m} value={m}>
                              {PRICING_MODEL_LABELS[m]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {pricingModel === "per_seat" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Cost Per Seat / Month ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={perSeatCost}
                        onChange={(e) =>
                          setPerSeatCost(parseFloat(e.target.value) || 0)
                        }
                        className="text-sm font-mono"
                      />
                    </div>
                  )}

                  {pricingModel === "flat_monthly" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Flat Monthly Cost ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={flatMonthlyCost}
                        onChange={(e) =>
                          setFlatMonthlyCost(parseFloat(e.target.value) || 0)
                        }
                        className="text-sm font-mono"
                      />
                    </div>
                  )}

                  {pricingModel === "tiered" &&
                    extracted.tier_rules.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs">Tier Rules</Label>
                        <div className="space-y-1">
                          {extracted.tier_rules.map((tier, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-mono"
                            >
                              <span>
                                {tier.minSeats}–
                                {tier.maxSeats ?? "∞"} seats
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                              <span className="font-semibold">
                                {formatCurrency(tier.costPerSeat)}/seat
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Vendor Minimum / Month ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="None"
                        value={vendorMinimum ?? ""}
                        onChange={(e) =>
                          setVendorMinimum(
                            e.target.value
                              ? parseFloat(e.target.value)
                              : null
                          )
                        }
                        className="text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Support Complexity (1–5)
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={supportComplexity}
                          onChange={(e) =>
                            setSupportComplexity(parseInt(e.target.value))
                          }
                          className="flex-1"
                        />
                        <span className="w-5 text-center text-sm font-mono font-semibold">
                          {supportComplexity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      Renewal Uplift (e.g. 0.03 = 3%)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={renewalUplift}
                      onChange={(e) =>
                        setRenewalUplift(parseFloat(e.target.value) || 0)
                      }
                      className="text-sm font-mono"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT: Stack Fit + Margin Preview */}
            <div className="space-y-4">
              {/* Stack Fit Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Stack Fit Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Category status */}
                  {isNewCategory ? (
                    <div className="flex items-start gap-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-400">
                          New capability for your stack
                        </p>
                        <p className="text-xs text-emerald-400/70 mt-0.5">
                          You don&apos;t currently have any{" "}
                          <strong>
                            {CATEGORY_LABELS[category as Tool["category"]]}
                          </strong>{" "}
                          tools. This fills a gap.
                        </p>
                      </div>
                    </div>
                  ) : overlappingTools.length > 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border bg-amber-500/10 border-amber-500/20 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-amber-400">
                          Category overlap detected
                        </p>
                        <p className="text-xs text-amber-400/70 mt-1">
                          You already have{" "}
                          {overlappingTools.length === 1
                            ? "a"
                            : overlappingTools.length}{" "}
                          <strong>
                            {CATEGORY_LABELS[category as Tool["category"]]}
                          </strong>{" "}
                          tool{overlappingTools.length > 1 ? "s" : ""}:
                        </p>
                        <ul className="mt-1 space-y-1">
                          {overlappingTools.map((t) => (
                            <li
                              key={t.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="font-medium text-amber-400">
                                {t.name}
                              </span>
                              <span className="font-mono text-amber-400/70">
                                {t.pricing_model === "per_seat"
                                  ? `${formatCurrency(Number(t.per_seat_cost))}/seat`
                                  : t.pricing_model === "flat_monthly"
                                    ? `${formatCurrency(Number(t.flat_monthly_cost))}/mo`
                                    : "Tiered"}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {pricingModel === "per_seat" &&
                          overlappingTools.some(
                            (t) => t.pricing_model === "per_seat"
                          ) && (
                            <p className="mt-2 text-xs text-amber-400/70">
                              {perSeatCost <
                              Number(
                                overlappingTools.find(
                                  (t) => t.pricing_model === "per_seat"
                                )?.per_seat_cost
                              ) ? (
                                <span className="font-semibold text-emerald-400">
                                  ↓ This vendor is cheaper per seat
                                </span>
                              ) : (
                                <span>
                                  ↑ Your existing tool costs less per seat
                                </span>
                              )}
                            </p>
                          )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted px-3 py-2">
                      <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Complements your existing stack in the{" "}
                        <strong>
                          {CATEGORY_LABELS[category as Tool["category"]]}
                        </strong>{" "}
                        category.
                      </p>
                    </div>
                  )}

                  {/* Current stack coverage */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Your current stack covers
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(existingCategories).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            cat === category &&
                              "bg-amber-500/10 text-amber-400"
                          )}
                        >
                          {CATEGORY_LABELS[cat as Tool["category"]]}
                        </Badge>
                      ))}
                      {isNewCategory && (
                        <Badge className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
                          + {CATEGORY_LABELS[category as Tool["category"]]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Margin Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Margin Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Seat count</Label>
                      <span className="text-sm font-mono font-semibold">
                        {seatCount}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={250}
                      step={1}
                      value={seatCount}
                      onChange={(e) => setSeatCount(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>250</span>
                    </div>
                  </div>

                  {pricing && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            True Cost/Seat
                          </p>
                          <p className="text-lg font-bold font-mono mt-0.5">
                            {formatCurrency(pricing.true_cost_per_seat)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            Sell Price/Seat
                          </p>
                          <p className="text-lg font-bold font-mono mt-0.5">
                            {formatCurrency(pricing.suggested_price_per_seat)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            Monthly MRR
                          </p>
                          <p className="text-lg font-bold font-mono mt-0.5">
                            {formatCurrency(pricing.total_mrr)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-center">
                          <p className="text-xs text-muted-foreground">
                            Margin
                          </p>
                          <p
                            className={cn(
                              "text-lg font-bold font-mono mt-0.5",
                              marginColor(pricing.margin_pct_pre_discount)
                            )}
                          >
                            {formatPercent(pricing.margin_pct_pre_discount)}
                          </p>
                        </div>
                      </div>

                      {pricing.flags.length > 0 && (
                        <div className="space-y-1">
                          {pricing.flags.map((f, i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs",
                                f.severity === "error"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-amber-500/10 text-amber-400"
                              )}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              {f.message}
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground text-center">
                        Using workspace defaults:{" "}
                        {formatPercent(defaultOverhead)} overhead ·{" "}
                        {formatPercent(defaultLabor)} labor ·{" "}
                        {formatPercent(defaultMargin)} target margin
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep("idle");
                setExtracted(null);
                setSelectedFile(null);
              }}
            >
              Upload Different File
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => router.push("/stack-catalog")}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isPending || !name.trim() || !vendor.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPending ? "Saving..." : "Add to Tool Catalog"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
