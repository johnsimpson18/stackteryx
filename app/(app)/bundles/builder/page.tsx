import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { hasPermission } from "@/lib/constants";
import { StackBuilderClient } from "./StackBuilderClient";

export default async function StackBuilderPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_bundles")) redirect("/dashboard");

  return <StackBuilderClient />;
}
