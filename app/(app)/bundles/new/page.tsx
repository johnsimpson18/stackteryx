import { getCurrentProfile } from "@/lib/db/profiles";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { BundleForm } from "@/components/bundles/bundle-form";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default async function NewBundlePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_bundles")) redirect("/services");

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Create Service"
        description="Create a new security service"
      />

      {/* AI recommendation banner */}
      <Link
        href="/sales-studio"
        className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/6 px-4 py-3 text-sm hover:bg-primary/10 transition-colors group"
      >
        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-primary">Not sure what to build?</p>
          <p className="text-xs text-primary/70 mt-0.5">
            Let AI analyse your stack catalog and recommend 3 optimised services for your client.
          </p>
        </div>
        <span className="text-xs text-primary/60 group-hover:text-primary transition-colors flex-shrink-0">
          Open Sales Studio →
        </span>
      </Link>

      <BundleForm />
    </div>
  );
}
