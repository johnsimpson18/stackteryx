"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StackCatalogClient } from "./stack-catalog-client";
import { PricingHealthClient } from "@/components/pricing/pricing-health-client";
import { VendorList } from "@/components/vendors/vendor-list";
import { VendorPageActions } from "@/components/vendors/vendor-page-actions";
import { PageHeader } from "@/components/shared/page-header";
import { RoleGate } from "@/components/shared/role-gate";
import { X, Layers2, ArrowRight } from "lucide-react";
import Link from "next/link";
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
import type { GlobalToolEntry } from "@/actions/global-tool-library";
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
  // Global library
  globalTools: GlobalToolEntry[];
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
  globalTools,
  initialTab = "catalog",
}: StackCatalogTabsProps) {
  const [bannerDismissed, setBannerDismissed] = useState(true);
  useEffect(() => {
    setBannerDismissed(localStorage.getItem("tools-banner-dismissed") === "true");
  }, []);

  function dismissBanner() {
    setBannerDismissed(true);
    localStorage.setItem("tools-banner-dismissed", "true");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools & Costs"
        description="Your tool inventory, pricing health, and vendor management"
      />
      <p className="text-xs text-muted-foreground/70 -mt-4">
        Tools are the individual products you use (e.g. CrowdStrike Falcon). Vendors are the companies behind them (optional &mdash; for managing vendor relationships).
      </p>

      {!bannerDismissed && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-3">
          <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
            This is where you manage the vendor tools you resell to clients.
            Add your tools here first — you&apos;ll select them when building services.
            Include the cost you pay each vendor so Stackteryx can calculate your margins accurately.
          </p>
          <button
            onClick={dismissBanner}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tools.length > 0 && (
        <Link
          href="/stack-builder"
          className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-foreground hover:border-primary/40 transition-colors"
        >
          <Layers2 className="h-4 w-4 text-primary" />
          <span>
            Ready to build a service?{" "}
            <span className="font-medium text-primary">Open Stack Builder</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-primary" />
        </Link>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Tool Catalog</TabsTrigger>
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
            globalTools={globalTools}
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
