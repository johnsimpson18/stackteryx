import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Get Started" };
import { createClient } from "@/lib/supabase/server";
import { getOnboardingProfile } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { getOrgById } from "@/lib/db/orgs";
import { OnboardingChat } from "@/components/onboarding/onboarding-chat";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  const savedProfile = await getOnboardingProfile(orgId).catch(() => null);

  if (savedProfile?.onboarding_complete) {
    redirect("/dashboard");
  }

  const [org, profileResult] = await Promise.all([
    getOrgById(orgId),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  return (
    <OnboardingChat
      orgName={org?.name ?? ""}
      displayName={profileResult.data?.display_name ?? ""}
      orgId={orgId}
    />
  );
}
