"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StackCatalogClient } from "./stack-catalog-client";
import { PricingHealthClient } from "@/components/pricing/pricing-health-client";
import { VendorList } from "@/components/vendors/vendor-list";
import { VendorPageActions } from "@/components/vendors/vendor-page-actions";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import type {
  ToolWithAssignments,
  DomainCoverage,
  RedundancyFlag,
  CoverageGap,
} from "@/lib/db/stack-catalog";
import type {
  UserRole,
  BundleWithMeta,
  ServiceCompleteness,
  OrgVendorWithMeta,
} from "@/lib/types";
import type { PricingStatus } from "@/lib/pricing/status";

interface StackCatalogTabsProps {
  // Stack Catalog data
  tools: ToolWithAssignments[];
  coverage: DomainCoverage[];
  coverageScore: number;
  redundancies: RedundancyFlag[];
  gaps: CoverageGap[];
  userRole: UserRole;
  // Pricing Health data
  bundles: BundleWithMeta[];
  completenessMap: Record<string, ServiceCompleteness>;
  staleMap: Record<string, boolean>;
  pricingStatusMap: Record<string, PricingStatus>;
  defaultTargetMargin: number;
  staleCount: number;
  // Vendor data
  vendors: OrgVendorWithMeta[];
  // Tab control
  initialTab?: string;
}

export function StackCatalogTabs({
  tools,
  coverage,
  coverageScore,
  redundancies,
  gaps,
  userRole,
  bundles,
  completenessMap,
  staleMap,
  pricingStatusMap,
  defaultTargetMargin,
  staleCount,
  vendors,
  initialTab = "catalog",
}: StackCatalogTabsProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Stack & Pricing"
        description="Your tool inventory, pricing health, and vendor management"
      />

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Stack Catalog</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Health</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <StackCatalogClient
            tools={tools}
            coverage={coverage}
            coverageScore={coverageScore}
            redundancies={redundancies}
            gaps={gaps}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingHealthClient
            bundles={bundles}
            completenessMap={completenessMap}
            staleMap={staleMap}
            pricingStatusMap={pricingStatusMap}
            defaultTargetMargin={defaultTargetMargin}
            staleCount={staleCount}
          />
        </TabsContent>

        <TabsContent value="vendors">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Vendor Costs</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your vendor relationships and cost models
                </p>
              </div>
              <RoleGate role={userRole} permission="create_tools">
                <VendorPageActions vendors={vendors} />
              </RoleGate>
            </div>
            <VendorList vendors={vendors} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
