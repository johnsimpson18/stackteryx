import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/org-context";
import { getGeneratedBundlesJson, getOnboardingProfile } from "@/lib/db/org-settings";
import { getBundles } from "@/lib/db/bundles";
import { getTools } from "@/lib/db/tools";
import { ResultsReveal } from "@/components/onboarding/results-reveal";

interface GeneratedBundle {
  name: string;
  tagline: string;
  description: string;
  idealFor: string;
  tools: string[];
  complianceAlignment: Record<string, number>;
  talkingPoints: string[];
  bundleId: string;
  versionId: string;
}

interface GeneratedData {
  topInsight: string;
  bundles: GeneratedBundle[];
}

export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const [generatedData, profile, bundles, allTools] = await Promise.all([
    getGeneratedBundlesJson(orgId),
    getOnboardingProfile(orgId),
    getBundles(orgId),
    getTools(orgId),
  ]);

  // If no generated data exists, skip to dashboard
  if (!generatedData) redirect("/dashboard");

  const generated = generatedData as GeneratedData;

  // Merge AI-generated qualitative data with DB financial data
  const enrichedBundles = generated.bundles.map((gb) => {
    const dbBundle = bundles.find((b) => b.id === gb.bundleId);
    return {
      bundleId: gb.bundleId,
      versionId: gb.versionId,
      name: gb.name,
      tagline: gb.tagline,
      description: gb.description,
      idealFor: gb.idealFor,
      toolNames: gb.tools,
      complianceAlignment: gb.complianceAlignment,
      talkingPoints: gb.talkingPoints,
      mrr: dbBundle?.latest_mrr ?? 0,
      margin: dbBundle?.latest_margin ?? 0,
    };
  });

  return (
    <ResultsReveal
      topInsight={generated.topInsight}
      bundles={enrichedBundles}
      complianceTargets={profile?.compliance_targets ?? []}
      toolCount={allTools.length}
      outcomeTypes={profile?.services_offered ?? []}
    />
  );
}
