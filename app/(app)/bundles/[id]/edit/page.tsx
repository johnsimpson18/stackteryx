import { notFound, redirect } from "next/navigation";
import { getBundleById } from "@/lib/db/bundles";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { BundleForm } from "@/components/bundles/bundle-form";

interface EditBundlePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBundlePage({
  params,
}: EditBundlePageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "edit_bundles")) redirect("/services");

  const bundle = await getBundleById(id);
  if (!bundle) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={`Edit: ${bundle.name}`}
        description="Update service details"
      />
      <BundleForm bundle={bundle} />
    </div>
  );
}
