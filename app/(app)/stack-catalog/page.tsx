import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Stack Catalog" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import {
  getToolsWithServiceAssignments,
  calculateCoverage,
  calculateCoverageScore,
  detectRedundancies,
  getGapDetails,
} from "@/lib/db/stack-catalog";
import { StackCatalogClient } from "@/components/stack-catalog/stack-catalog-client";

export default async function StackCatalogPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const tools = await getToolsWithServiceAssignments(orgId);
  const coverage = calculateCoverage(tools);
  const coverageScore = calculateCoverageScore(coverage);
  const redundancies = detectRedundancies(tools);
  const gaps = getGapDetails(coverage);

  return (
    <StackCatalogClient
      tools={tools}
      coverage={coverage}
      coverageScore={coverageScore}
      redundancies={redundancies}
      gaps={gaps}
      userRole={profile.role}
    />
  );
}
