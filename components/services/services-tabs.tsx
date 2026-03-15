"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { ServicesList } from "./services-list";
import { PackagesList } from "@/components/packages/packages-list";
import { AdditionalServicesClient } from "@/components/additional-services/additional-services-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { BundleWithMeta, ServiceCompleteness, TierPackageWithMeta, AdditionalService, UserRole } from "@/lib/types";
import type { PricingStatus } from "@/lib/pricing/status";

interface ServicesTabsProps {
  // Services data
  bundles: BundleWithMeta[];
  completenessMap: Record<string, ServiceCompleteness>;
  outcomeTypeMap: Record<string, string>;
  staleMap: Record<string, boolean>;
  pricingStatusMap: Record<string, PricingStatus>;
  initialFilter?: "all" | "active" | "draft" | "stale";
  // Packages data
  packages: TierPackageWithMeta[];
  // Additional services data
  additionalServices: AdditionalService[];
  additionalServiceUsageMap?: Record<string, { bundle_id: string; bundle_name: string }[]>;
  // Shared
  userRole: UserRole;
  initialTab?: string;
}

export function ServicesTabs({
  bundles,
  completenessMap,
  outcomeTypeMap,
  staleMap,
  pricingStatusMap,
  initialFilter,
  packages,
  additionalServices,
  additionalServiceUsageMap = {},
  userRole,
  initialTab = "services",
}: ServicesTabsProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Build and manage your security service portfolio"
      >
        <RoleGate role={userRole} permission="create_bundles">
          <Button asChild>
            <Link href="/services/new">
              <Plus className="h-4 w-4 mr-2" />
              Build a Service
            </Link>
          </Button>
        </RoleGate>
      </PageHeader>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="add-ons">Add-Ons</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ServicesList
            bundles={bundles}
            completenessMap={completenessMap}
            outcomeTypeMap={outcomeTypeMap}
            staleMap={staleMap}
            pricingStatusMap={pricingStatusMap}
            initialFilter={initialFilter}
          />
        </TabsContent>

        <TabsContent value="packages">
          <PackagesList packages={packages} />
        </TabsContent>

        <TabsContent value="add-ons">
          <AdditionalServicesClient services={additionalServices} usageMap={additionalServiceUsageMap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
