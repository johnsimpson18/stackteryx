"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, ChevronDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recommendRequestSchema, INDUSTRY_LABELS, COMPLIANCE_LABELS } from "@/lib/schemas/recommend";
import type { RecommendRequest } from "@/lib/schemas/recommend";
import type { UserRole } from "@/lib/types";

const COMPLIANCE_OPTIONS = ["hipaa", "pci_dss", "cmmc", "sox", "gdpr", "none"] as const;

const RISK_OPTIONS = [
  {
    value: "low",
    label: "Low",
    description: "Client is risk-averse, has compliance obligations, or operates in a regulated industry.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Typical SMB — wants solid security but is price-sensitive.",
  },
  {
    value: "high",
    label: "High",
    description: "Cost-conscious, minimal compliance requirements, will accept some exposure.",
  },
] as const;

interface ClientProfileFormProps {
  onSubmit: (data: RecommendRequest) => void;
  isStreaming: boolean;
  userRole: UserRole;
}

export function ClientProfileForm({ onSubmit, isStreaming, userRole }: ClientProfileFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isViewer = userRole === "viewer";

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecommendRequest>({
    resolver: zodResolver(recommendRequestSchema),
    defaultValues: {
      complianceRequirements: [],
      riskTolerance: "moderate",
    },
  });

  const selectedCompliance = watch("complianceRequirements") ?? [];

  function toggleCompliance(value: string) {
    const current = selectedCompliance;
    if (value === "none") {
      setValue("complianceRequirements", current.includes("none") ? [] : ["none"]);
      return;
    }
    const withoutNone = current.filter((c) => c !== "none");
    if (current.includes(value as never)) {
      setValue("complianceRequirements", withoutNone.filter((c) => c !== value) as never[]);
    } else {
      setValue("complianceRequirements", [...withoutNone, value] as never[]);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Viewer notice */}
      {isViewer && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-amber-300">
          Viewers can see this page but cannot generate recommendations. Contact your workspace owner to change your role.
        </div>
      )}

      {/* Section 1 — Client Info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Client Information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              placeholder="e.g. Acme Legal Group"
              {...register("clientName")}
              className={cn(errors.clientName && "border-red-500/50")}
            />
            {errors.clientName && (
              <p className="text-xs text-red-400">{errors.clientName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry *</Label>
            <Controller
              name="industry"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className={cn(errors.industry && "border-red-500/50")}>
                    <SelectValue placeholder="Select industry…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDUSTRY_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.industry && (
              <p className="text-xs text-red-400">{errors.industry.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seatCount">Seat Count *</Label>
            <Input
              id="seatCount"
              type="number"
              min={1}
              max={10000}
              placeholder="e.g. 50"
              {...register("seatCount", { valueAsNumber: true })}
              className={cn(errors.seatCount && "border-red-500/50")}
            />
            {errors.seatCount && (
              <p className="text-xs text-red-400">{errors.seatCount.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2 — Risk & Compliance */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Risk & Compliance</h3>

        <div className="space-y-2">
          <Label>Client Risk Tolerance</Label>
          <div className="space-y-2">
            {RISK_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-all duration-150",
                  "hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register("riskTolerance")}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Compliance Requirements</Label>
          <div className="flex flex-wrap gap-2">
            {COMPLIANCE_OPTIONS.map((opt) => {
              const selected = selectedCompliance.includes(opt as never);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleCompliance(opt)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
                    selected
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {COMPLIANCE_LABELS[opt]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 3 — Advanced (collapsible) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-foreground hover:bg-white/3 transition-colors"
        >
          <span>Budget & Context <span className="text-muted-foreground font-normal">(optional)</span></span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              showAdvanced && "rotate-180"
            )}
          />
        </button>

        {showAdvanced && (
          <div className="px-5 pb-5 space-y-4 border-t border-border/50">
            <div className="space-y-1.5 pt-4">
              <Label htmlFor="budgetPerSeatMax">Max Budget Per Seat / Month</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="budgetPerSeatMax"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 25.00"
                  className="pl-9"
                  {...register("budgetPerSeatMax", { valueAsNumber: true })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                AI will flag recommendations that exceed this threshold.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentPainPoints">Current Pain Points</Label>
              <Textarea
                id="currentPainPoints"
                placeholder="e.g. Recent phishing incident, no MFA deployed, staff working remotely without VPN…"
                rows={3}
                {...register("currentPainPoints")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any other context for the AI…"
                rows={2}
                {...register("notes")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isStreaming || isViewer}
      >
        <Sparkles className="h-4 w-4" />
        {isStreaming ? "Generating…" : "Generate Recommendations"}
      </Button>
    </form>
  );
}
