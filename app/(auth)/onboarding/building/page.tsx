import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getActiveOrgId } from "@/lib/org-context";
import { BuildingScreen } from "@/components/onboarding/building-screen";

export default async function BuildingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/login");

  // If onboarding is already complete, go to dashboard
  try {
    const settings = await getOrgSettings(orgId);
    if (settings?.onboarding_completed) {
      redirect("/dashboard");
    }
  } catch {
    // Settings not yet created — proceed with building
  }

  return <BuildingScreen orgId={orgId} />;
}
