import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getClients } from "@/lib/db/clients";
import { getActiveOrgId } from "@/lib/org-context";
import { getCTOBriefs } from "@/actions/fractional-cto";
import { PageHeader } from "@/components/shared/page-header";
import { FractionalCTOClient } from "@/components/fractional-cto/fractional-cto-client";

export const metadata: Metadata = { title: "Fractional CTO" };

export default async function CTOBriefsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/dashboard");

  const [clients, briefs] = await Promise.all([
    getClients(orgId),
    getCTOBriefs(),
  ]);

  const clientList = clients.map((c) => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    contactEmail: c.contact_email,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fractional CTO Intelligence"
        description="Generate and manage technology strategy briefs for your clients"
      />

      <FractionalCTOClient
        clients={clientList}
        briefs={briefs}
        mspName={profile.display_name ?? ""}
      />
    </div>
  );
}
