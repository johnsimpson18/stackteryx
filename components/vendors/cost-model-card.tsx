"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Layers, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CostModelForm } from "./cost-model-form";
import { saveDiscountAction, deleteCostModelAction } from "@/actions/vendors";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatting";
import {
  BILLING_BASIS_LABELS,
  CADENCE_LABELS,
} from "@/lib/constants";
import type {
  CostModelWithTiers,
  OrgVendorDiscount,
  BillingBasis,
  BillingCadence,
  DiscountType,
} from "@/lib/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface CostModelCardProps {
  costModel: CostModelWithTiers;
  orgVendorId: string;
  discount?: OrgVendorDiscount;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CostModelCard({
  costModel,
  orgVendorId,
  discount,
}: CostModelCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteCostModelAction(costModel.id, orgVendorId);
      if (result.success) {
        toast.success("Cost model deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Cost Model</CardTitle>
        </CardHeader>
        <CardContent>
          <CostModelForm
            orgVendorId={orgVendorId}
            costModel={costModel}
            onClose={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{costModel.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {BILLING_BASIS_LABELS[costModel.billing_basis as BillingBasis] ??
                  costModel.billing_basis}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {CADENCE_LABELS[costModel.cadence as BillingCadence] ??
                  costModel.cadence}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiscount(!showDiscount)}
              className="text-xs"
            >
              <Tag className="h-3.5 w-3.5 mr-1" />
              Discount
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete cost model?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this pricing configuration.
                    Services using this cost model will not be affected
                    immediately but will lose the reference.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleDelete}
                  >
                    Delete Cost Model
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tiers */}
        {costModel.tiers.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span>{costModel.tiers.length} tier{costModel.tiers.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-1.5 font-medium">Min</th>
                    <th className="text-left px-3 py-1.5 font-medium">Max</th>
                    <th className="text-right px-3 py-1.5 font-medium">Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {costModel.tiers.map((tier) => (
                    <tr key={tier.id} className="border-t border-border">
                      <td className="px-3 py-1.5">{tier.min_value}</td>
                      <td className="px-3 py-1.5">
                        {tier.max_value != null ? tier.max_value : "∞"}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {formatCurrency(tier.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No tiers defined.</p>
        )}

        {/* Discount */}
        {discount && (
          <div className="text-xs text-muted-foreground">
            Discount: {discount.discount_type === "percent"
              ? `${discount.value}%`
              : formatCurrency(discount.value ?? 0)} off
          </div>
        )}

        {/* Inline discount form */}
        {showDiscount && (
          <DiscountInlineForm
            orgVendorId={orgVendorId}
            existing={discount}
            onClose={() => setShowDiscount(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Inline discount form ─────────────────────────────────────────────────────

function DiscountInlineForm({
  orgVendorId,
  existing,
  onClose,
}: {
  orgVendorId: string;
  existing?: OrgVendorDiscount;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [discountType, setDiscountType] = useState<DiscountType>(
    existing?.discount_type as DiscountType ?? "percent"
  );
  const [value, setValue] = useState(String(existing?.value ?? ""));

  function handleSave() {
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Discount value must be a positive number");
      return;
    }

    startTransition(async () => {
      const result = await saveDiscountAction({
        org_vendor_id: orgVendorId,
        discount_type: discountType,
        value: numVal,
      });

      if (result.success) {
        toast.success("Discount saved");
        router.refresh();
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/20">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <Select
            value={discountType}
            onValueChange={(v) => setDiscountType(v as DiscountType)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percent (%)</SelectItem>
              <SelectItem value="fixed">Fixed ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Value</Label>
          <Input
            type="number"
            step="0.01"
            className="h-8 text-xs"
            placeholder={discountType === "percent" ? "10" : "5.00"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="text-xs h-7"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          className="text-xs h-7"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
