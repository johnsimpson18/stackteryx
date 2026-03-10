"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { saveCostModelAction } from "@/actions/vendors";
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
import { toast } from "sonner";
import type { CostModelWithTiers } from "@/lib/types";
import {
  BILLING_BASIS_LABELS,
  BILLING_BASIS_OPTIONS,
  CADENCE_LABELS,
} from "@/lib/constants";

// ── Schema ───────────────────────────────────────────────────────────────────

const tierSchema = z.object({
  min_value: z.coerce.number().min(0, "Min must be >= 0"),
  max_value: z.coerce.number().nullable().optional(),
  unit_price: z.coerce.number().positive("Price must be > 0"),
});

const costModelFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  billing_basis: z.enum([
    "per_user", "per_device", "per_domain", "per_location",
    "per_org", "flat_monthly", "usage", "tiered",
  ]),
  cadence: z.enum(["monthly", "annual"]),
  tiers: z.array(tierSchema).default([]),
});

type CostModelFormValues = z.infer<typeof costModelFormSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface CostModelFormProps {
  orgVendorId: string;
  costModel?: CostModelWithTiers;
  onClose?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CostModelForm({
  orgVendorId,
  costModel,
  onClose,
}: CostModelFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!costModel;

  const form = useForm<CostModelFormValues>({
    resolver: zodResolver(costModelFormSchema),
    defaultValues: {
      name: costModel?.name ?? "",
      billing_basis: costModel?.billing_basis ?? "per_user",
      cadence: costModel?.cadence ?? "monthly",
      tiers: costModel?.tiers?.map((t) => ({
        min_value: t.min_value,
        max_value: t.max_value ?? null,
        unit_price: t.unit_price,
      })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tiers",
  });

  function onSubmit(data: CostModelFormValues) {
    startTransition(async () => {
      const payload = {
        org_vendor_id: orgVendorId,
        name: data.name,
        billing_basis: data.billing_basis,
        cadence: data.cadence,
        tiers: data.tiers,
      };

      const result = await saveCostModelAction(
        payload,
        costModel?.id
      );

      if (result.success) {
        toast.success(isEditing ? "Cost model updated" : "Cost model added");
        router.refresh();
        onClose?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="cm-name">Name *</Label>
        <Input
          id="cm-name"
          placeholder="e.g. Standard Per-User License"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Billing Basis & Cadence */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Billing Basis *</Label>
          <Select
            value={form.watch("billing_basis")}
            onValueChange={(val) =>
              form.setValue(
                "billing_basis",
                val as CostModelFormValues["billing_basis"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BILLING_BASIS_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {BILLING_BASIS_LABELS[opt]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cadence *</Label>
          <Select
            value={form.watch("cadence")}
            onValueChange={(val) =>
              form.setValue("cadence", val as CostModelFormValues["cadence"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{CADENCE_LABELS.monthly}</SelectItem>
              <SelectItem value="annual">{CADENCE_LABELS.annual}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tiers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Pricing Tiers</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ min_value: fields.length === 0 ? 0 : (fields.length * 50), max_value: null, unit_price: 0 })
            }
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Tier
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No tiers defined. Add tiers to define volume-based pricing.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end"
          >
            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">
                  Min Value
                </Label>
              )}
              <Input
                type="number"
                step="1"
                placeholder="0"
                {...form.register(`tiers.${index}.min_value`)}
              />
            </div>
            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">
                  Max Value
                </Label>
              )}
              <Input
                type="number"
                step="1"
                placeholder="∞"
                {...form.register(`tiers.${index}.max_value`)}
              />
            </div>
            <div className="space-y-1">
              {index === 0 && (
                <Label className="text-xs text-muted-foreground">
                  Unit Price ($)
                </Label>
              )}
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register(`tiers.${index}.unit_price`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-red-500"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : isEditing
              ? "Save Cost Model"
              : "Add Cost Model"}
        </Button>
        {onClose && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
