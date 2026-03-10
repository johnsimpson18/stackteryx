import type { Metadata } from "next";
import { getTools } from "@/lib/db/tools";

export const metadata: Metadata = { title: "Stack Catalog" };
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ToolList } from "@/components/tools/tool-list";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/shared/role-gate";
import { Plus, Upload } from "lucide-react";
import Link from "next/link";

export default async function ToolsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  const tools = await getTools(orgId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stack Catalog"
        description="Manage your MSP security tool stack"
      >
        <RoleGate role={profile.role} permission="create_tools">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/tools/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload Vendor Pricing
              </Link>
            </Button>
            <Button asChild>
              <Link href="/tools/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </Link>
            </Button>
          </div>
        </RoleGate>
      </PageHeader>

      <ToolList tools={tools} userRole={profile.role} />
    </div>
  );
}
