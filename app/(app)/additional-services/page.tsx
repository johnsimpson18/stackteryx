import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { getAdditionalServicesByOrgId } from "@/lib/db/additional-services";
import { AdditionalServicesClient } from "@/components/additional-services/additional-services-client";

export const metadata: Metadata = { title: "Additional Services" };

export default async function AdditionalServicesPage() {
  const [profile, orgId] = await Promise.all([
    getCurrentProfile(),
    getActiveOrgId(),
  ]);
  if (!profile) redirect("/login");
  if (!orgId) redirect("/dashboard");

  const services = await getAdditionalServicesByOrgId(orgId);

  return <AdditionalServicesClient services={services} />;
}
