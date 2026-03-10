import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClientById } from "@/lib/db/clients";
import { hasPermission } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { ClientForm } from "@/components/clients/client-form";

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "edit_clients")) redirect(`/clients/${id}`);

  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Client"
        description={`Editing ${client.name}`}
      />
      <ClientForm client={client} />
    </div>
  );
}
