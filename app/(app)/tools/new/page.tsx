import { getCurrentProfile } from "@/lib/db/profiles";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { ToolForm } from "@/components/tools/tool-form";

export default async function NewToolPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_tools")) redirect("/stack-catalog");

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Add New Tool"
        description="Add a security tool to your stack intelligence library"
      />
      <ToolForm />
    </div>
  );
}
