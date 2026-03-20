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
import { Plus, Brain, ArrowRight, Loader2, ChevronRight, Lightbulb, X, Layers2 } from "lucide-react";
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
  const [packageCtaDismissed, setPackageCtaDismissed] = useState(false);

  const activeServicesCount = bundles.filter((b) => b.status === "active").length;
  const showPackageCta = activeServicesCount >= 2 && packages.length === 0 && !packageCtaDismissed;

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
        description="Design, price, and manage the services you sell"
      >
        <RoleGate role={userRole} permission="create_bundles">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="lg" className="gap-2 px-5">
              <Link href="/stack-builder">
                <Layers2 className="h-4 w-4" />
                Stack Builder
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-6 font-semibold">
              <Link href="/services/new">
                Build a Service
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </RoleGate>
      </PageHeader>

      {/* Sales Studio CTA — shown when user has services */}
      {bundles.length > 0 && (
        <div
          className="rounded-xl px-5 py-3 flex items-center justify-between"
          style={{
            background: "#0d1a00",
            border: "1px solid rgba(200,241,53,0.2)",
          }}
        >
          <span className="text-sm text-muted-foreground">
            Ready to turn your services into client proposals?
          </span>
          <Link
            href="/sales-studio"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            Go to Sales Studio &rarr;
          </Link>
        </div>
      )}

      {/* Zero-services guidance */}
      {bundles.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Start by building your first service. Add your tools in{" "}
            <Link href="/stack-catalog" className="text-primary hover:underline font-medium">
              Tools &amp; Costs
            </Link>{" "}
            first, then come back here to design a service around what you deliver.
          </p>
        </div>
      )}

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

      {/* Package discovery callout */}
      {showPackageCta && (
        <div
          className="rounded-xl px-5 py-4 flex items-start gap-3 relative"
          style={{
            backgroundColor: "#111111",
            borderLeft: "3px solid #A8FF3E",
          }}
        >
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground font-medium">
              You have {activeServicesCount} active services.
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Ready to package them into tiers your clients can choose from?
            </p>
            <Link
              href="/packages/new"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
            >
              Create a Package
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setPackageCtaDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="packages">
            Packages{packages.length > 0 ? ` (${packages.length})` : ""}
          </TabsTrigger>
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
