import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "create_clients")) redirect("/clients");

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Client"
        description="Add a new client to your portfolio"
      />
      <ClientForm />
    </div>
  );
}
