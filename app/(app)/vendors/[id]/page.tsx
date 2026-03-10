import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgVendorById } from "@/lib/db/vendors";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { VendorDetailClient } from "@/components/vendors/vendor-detail-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Pencil, Building2 } from "lucide-react";
import Link from "next/link";
import type { ToolCategory } from "@/lib/types";

interface VendorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorDetailPage({
  params,
}: VendorDetailPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const vendor = await getOrgVendorById(orgId, id);
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={vendor.display_name}>
        <Button variant="outline" asChild>
          <Link href={`/vendors/${id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Vendor
          </Link>
        </Button>
      </PageHeader>

      {/* Vendor Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Vendor Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Category</span>
              <div className="mt-0.5">
                {vendor.category ? (
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[vendor.category as ToolCategory] ??
                      vendor.category}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Global Vendor</span>
              <div className="mt-0.5">
                {vendor.global_vendor_name ? (
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{vendor.global_vendor_name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
          {vendor.notes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Notes</span>
              <p className="mt-0.5 text-foreground">{vendor.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Models */}
      <VendorDetailClient
        vendorId={vendor.id}
        costModels={vendor.cost_models}
        discounts={vendor.discounts}
      />
    </div>
  );
}
