"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VersionDetail } from "./version-detail";
import { PricingAdvisor } from "./pricing-advisor";
import { EnablementStudio } from "./enablement-studio";
import { Sparkles, ChevronRight } from "lucide-react";
import type { BundleVersionWithTools, EnablementContent } from "@/lib/types";

interface VersionTabsProps {
  version: BundleVersionWithTools;
  bundleName: string;
  bundleVersionId: string;
  enablementContent: EnablementContent | null;
  enablementGeneratedAt: string | null;
  defaultTab?: string;
}

export function VersionTabs({
  version,
  bundleName,
  bundleVersionId,
  enablementContent,
  enablementGeneratedAt,
  defaultTab = "overview",
}: VersionTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const hasEnablement = enablementContent !== null &&
    Object.values(enablementContent).some((v) => v && v.length > 0);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, pathname, searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="enablement">Enablement</TabsTrigger>
      </TabsList>

      {/* Enablement discovery banner */}
      {activeTab !== "enablement" && !hasEnablement && (
        <button
          onClick={() => handleTabChange("enablement")}
          className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mt-4 text-sm hover:bg-primary/10 transition-colors group text-left"
        >
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-primary">
              Ready to enable your sales team?
            </p>
            <p className="text-xs text-primary/70 mt-0.5">
              Generate a sales package for this bundle in seconds.
            </p>
          </div>
          <span className="text-xs text-primary/70 group-hover:text-primary transition-colors flex items-center gap-0.5 flex-shrink-0">
            Go to Enablement
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      <TabsContent value="overview" className="mt-4">
        <VersionDetail version={version} />
      </TabsContent>

      <TabsContent value="pricing" className="mt-4">
        <PricingAdvisor version={version} bundleName={bundleName} />
      </TabsContent>

      <TabsContent value="enablement" className="mt-4">
        <EnablementStudio
          bundleVersionId={bundleVersionId}
          initialContent={enablementContent}
          generatedAt={enablementGeneratedAt}
        />
      </TabsContent>
    </Tabs>
  );
}
