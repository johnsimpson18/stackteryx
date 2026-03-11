import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getBundles } from "@/lib/db/bundles";
import { NewPackageWizard } from "@/components/packages/new-package-wizard";

export const metadata: Metadata = { title: "New Package" };

export default async function NewPackagePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const bundles = await getBundles(orgId);

  // Only show active services as tier options
  const activeBundles = bundles
    .filter((b) => b.status === "active")
    .map((b) => ({
      id: b.id,
      name: b.name,
      bundle_type: b.bundle_type,
      latest_mrr: b.latest_mrr,
    }));

  return <NewPackageWizard activeBundles={activeBundles} />;
}
