"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { ServicesList } from "./services-list";
import { PackagesList } from "@/components/packages/packages-list";
import { AdditionalServicesClient } from "@/components/additional-services/additional-services-client";
import { Button } from "@/components/ui/button";
import { Plus, Brain, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { addFractionalCTOService } from "@/actions/fractional-cto-template";
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
  hasAdvisoryService?: boolean;
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
  hasAdvisoryService: initialHasAdvisory = false,
}: ServicesTabsProps) {
  const router = useRouter();
  const [hasAdvisory, setHasAdvisory] = useState(initialHasAdvisory);
  const [adding, startAdding] = useTransition();

  function handleAddTemplate() {
    startAdding(async () => {
      try {
        const result = await addFractionalCTOService();
        if ("error" in result) {
          if (result.error === "ALREADY_EXISTS") {
            toast.info("You already have a Fractional CTO Advisory service");
            setHasAdvisory(true);
          } else {
            toast.error(result.error);
          }
          return;
        }
        toast.success("Fractional CTO Advisory added to your services");
        setHasAdvisory(true);
        router.push(`/services/${result.serviceId}`);
      } catch {
        toast.error("Failed to add service. Please try again.");
      }
    });
  }

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

      {/* Fractional CTO Template Card */}
      {!hasAdvisory && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(200,241,53,0.15)" }}>
            <Brain className="h-5 w-5" style={{ color: "#5a9e00" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Fractional CTO Advisory
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Turn your MSP into a strategic technology advisor. Pre-built with
              outcomes, deliverables, and pricing — ready to sell in minutes.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAddTemplate}
            disabled={adding}
            className="shrink-0"
          >
            {adding ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                Add to My Services
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      )}

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
