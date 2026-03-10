"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CostModelCard } from "./cost-model-card";
import { CostModelForm } from "./cost-model-form";
import type { CostModelWithTiers, OrgVendorDiscount } from "@/lib/types";

interface VendorDetailClientProps {
  vendorId: string;
  costModels: CostModelWithTiers[];
  discounts: OrgVendorDiscount[];
}

export function VendorDetailClient({
  vendorId,
  costModels,
  discounts,
}: VendorDetailClientProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Cost Models ({costModels.length})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Cost Model
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Cost Model</CardTitle>
          </CardHeader>
          <CardContent>
            <CostModelForm
              orgVendorId={vendorId}
              onClose={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {costModels.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-foreground">No cost models yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a cost model to enable accurate pricing for this vendor.
          </p>
          <Button
            className="mt-4"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Cost Model
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        {costModels.map((cm) => (
          <CostModelCard
            key={cm.id}
            costModel={cm}
            orgVendorId={vendorId}
            discount={discounts.find((d) => d.org_vendor_id === vendorId)}
          />
        ))}
      </div>
    </div>
  );
}
