import { notFound, redirect } from "next/navigation";
import { getToolById } from "@/lib/db/tools";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { ToolForm } from "@/components/tools/tool-form";

interface EditToolPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditToolPage({ params }: EditToolPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "edit_tools")) redirect("/stack-catalog");

  const tool = await getToolById(id);
  if (!tool) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={`Edit: ${tool.name}`}
        description="Update tool configuration and pricing"
      />
      <ToolForm tool={tool} />
    </div>
  );
}
