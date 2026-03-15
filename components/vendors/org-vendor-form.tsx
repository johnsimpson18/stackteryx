"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  createOrgVendorAction,
  updateOrgVendorAction,
} from "@/actions/vendors";
import { TOOL_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
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
import { toast } from "sonner";
import type { OrgVendor, GlobalVendor } from "@/lib/types";

// ── Schema ───────────────────────────────────────────────────────────────────

const vendorFormSchema = z.object({
  display_name: z.string().min(1, "Vendor name is required").max(200),
  category: z.string().optional(),
  notes: z.string().max(2000).optional(),
  vendor_id: z.string().optional(),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface OrgVendorFormProps {
  vendor?: OrgVendor;
  globalVendors?: GlobalVendor[];
  onSuccess?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function OrgVendorForm({ vendor, globalVendors = [], onSuccess }: OrgVendorFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditing = !!vendor;

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      display_name: vendor?.display_name ?? "",
      category: vendor?.category ?? "",
      notes: vendor?.notes ?? "",
      vendor_id: vendor?.vendor_id ?? "",
    },
  });

  function onSubmit(data: VendorFormValues) {
    startTransition(async () => {
      const payload = {
        display_name: data.display_name,
        category: data.category || null,
        notes: data.notes || null,
        vendor_id: data.vendor_id || null,
      };

      const result = isEditing
        ? await updateOrgVendorAction(vendor.id, payload)
        : await createOrgVendorAction(payload);

      if (result.success) {
        toast.success(isEditing ? "Vendor updated" : "Vendor added");
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(isEditing ? `/vendors/${vendor.id}` : "/vendors");
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Vendor Name */}
      <div className="space-y-2">
        <Label htmlFor="display_name">Vendor Name *</Label>
        <Input
          id="display_name"
          placeholder="e.g. SentinelOne"
          {...form.register("display_name")}
        />
        {form.formState.errors.display_name && (
          <p className="text-sm text-red-500">
            {form.formState.errors.display_name.message}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={form.watch("category") || ""}
          onValueChange={(val) => form.setValue("category", val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
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

      {/* Link to Global Vendor */}
      {globalVendors.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="vendor_id">Link to Global Vendor (optional)</Label>
          <Select
            value={form.watch("vendor_id") || ""}
            onValueChange={(val) => form.setValue("vendor_id", val === "__none__" ? "" : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a global vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {globalVendors.map((gv) => (
                <SelectItem key={gv.id} value={gv.id}>
                  {gv.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Linking to a global vendor lets you track which catalog vendor this represents.
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Internal notes about this vendor relationship..."
          {...form.register("notes")}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEditing
              ? "Saving..."
              : "Adding..."
            : isEditing
              ? "Save Changes"
              : "Add Vendor"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess ? onSuccess() : router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
