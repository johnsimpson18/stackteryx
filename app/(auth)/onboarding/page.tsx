import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Get Started" };
import { createClient } from "@/lib/supabase/server";
import { getOnboardingProfile } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { getOrgById } from "@/lib/db/orgs";
import { getOnboardingTools } from "@/lib/db/onboarding-tools";
import { WizardShell } from "@/components/onboarding/wizard-shell";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  // Fetch onboarding profile early — used for guard and wizard state
  const savedProfile = await getOnboardingProfile(orgId).catch(() => null);

  // If onboarding already done, go to dashboard.
  if (savedProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  // Fetch org name, profile display name, and saved tools
  const [org, profileResult, savedTools] = await Promise.all([
    getOrgById(orgId),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    getOnboardingTools(orgId).catch(() => []),
  ]);

  return (
    <WizardShell
      defaultOrgName={org?.name ?? ""}
      defaultDisplayName={profileResult.data?.display_name ?? ""}
      savedProfile={savedProfile}
      savedStep={savedProfile?.onboarding_step ?? 1}
      savedTools={savedTools}
    />
  );
}
