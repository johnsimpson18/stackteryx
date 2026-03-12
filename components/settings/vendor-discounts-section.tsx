"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  saveVendorDiscountAction,
  deleteVendorDiscountAction,
} from "@/actions/vendor-discounts";
import type { OrgVendorDiscount, DiscountType } from "@/lib/types";

interface VendorDiscountRow {
  id: string;
  displayName: string;
  discount: OrgVendorDiscount | null;
}

interface VendorDiscountsSectionProps {
  vendors: VendorDiscountRow[];
  canEdit: boolean;
}

export function VendorDiscountsSection({
  vendors,
  canEdit,
}: VendorDiscountsSectionProps) {
  const [isPending, startTransition] = useTransition();
  const [editState, setEditState] = useState<
    Record<string, { type: DiscountType; value: string }>
  >(() => {
    const init: Record<string, { type: DiscountType; value: string }> = {};
    for (const v of vendors) {
      if (v.discount) {
        init[v.id] = {
          type: v.discount.discount_type,
          value: String(v.discount.value ?? ""),
        };
      }
    }
    return init;
  });
  const [showAdd, setShowAdd] = useState(false);

  const vendorsWithDiscount = vendors.filter((v) => v.discount || editState[v.id]);
  const vendorsWithoutDiscount = vendors.filter(
    (v) => !v.discount && !editState[v.id],
  );

  function handleSave(orgVendorId: string) {
    const state = editState[orgVendorId];
    if (!state || !state.value) return;

    startTransition(async () => {
      const result = await saveVendorDiscountAction(
        orgVendorId,
        state.type,
        parseFloat(state.value),
      );
      if (result.success) {
        toast.success("Discount saved");
      } else {
        toast.error(result.error ?? "Failed to save discount");
      }
    });
  }

  function handleDelete(orgVendorId: string) {
    startTransition(async () => {
      const result = await deleteVendorDiscountAction(orgVendorId);
      if (result.success) {
        setEditState((prev) => {
          const next = { ...prev };
          delete next[orgVendorId];
          return next;
        });
        toast.success("Discount removed");
      } else {
        toast.error(result.error ?? "Failed to remove discount");
      }
    });
  }

  function handleAddDiscount(orgVendorId: string) {
    setEditState((prev) => ({
      ...prev,
      [orgVendorId]: { type: "percent" as DiscountType, value: "" },
    }));
    setShowAdd(false);
  }

  if (vendors.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Vendor Discounts</CardTitle>
        {canEdit && vendorsWithoutDiscount.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(!showAdd)}
          >
            Add Discount
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && vendorsWithoutDiscount.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Select a vendor to add a discount:
            </p>
            <div className="flex flex-wrap gap-2">
              {vendorsWithoutDiscount.map((v) => (
                <Button
                  key={v.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddDiscount(v.id)}
                >
                  {v.displayName}
                </Button>
              ))}
            </div>
          </div>
        )}

        {vendorsWithDiscount.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorsWithDiscount.map((v) => {
                const state = editState[v.id] ?? {
                  type: v.discount?.discount_type ?? ("percent" as DiscountType),
                  value: String(v.discount?.value ?? ""),
                };

                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.displayName}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={state.type}
                          onValueChange={(val) =>
                            setEditState((prev) => ({
                              ...prev,
                              [v.id]: { ...state, type: val as DiscountType },
                            }))
                          }
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm capitalize">
                          {state.type}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={state.value}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [v.id]: { ...state, value: e.target.value },
                            }))
                          }
                          className="w-24 h-8 text-xs font-mono"
                          placeholder={
                            state.type === "percent" ? "e.g. 10" : "e.g. 5.00"
                          }
                        />
                      ) : (
                        <span className="font-mono text-sm">
                          {state.type === "percent"
                            ? `${state.value}%`
                            : `$${state.value}`}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={isPending || !state.value}
                            onClick={() => handleSave(v.id)}
                          >
                            {isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            disabled={isPending}
                            onClick={() => handleDelete(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No vendor discounts configured. Add a discount to reduce tool costs
            across your service configurations.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
