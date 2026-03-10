import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getUserOrgMemberships, getOrgMemberCount } from "@/lib/db/org-members";
import { getActiveOrgId } from "@/lib/org-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const orgId = await getActiveOrgId();
  const settings = orgId ? await getOrgSettings(orgId) : null;
  const workspaceName = settings?.workspace_name ?? "Stackteryx";

  let userOrgs: { org_id: string; org_name: string }[] = [];
  let memberCount = 1;
  try {
    const [orgsResult, countResult] = await Promise.allSettled([
      getUserOrgMemberships(profile.id),
      orgId ? getOrgMemberCount(orgId) : Promise.resolve(1),
    ]);
    userOrgs = orgsResult.status === "fulfilled" ? orgsResult.value : [];
    memberCount = countResult.status === "fulfilled" ? countResult.value : 1;
  } catch {
    // Degrade gracefully — show single org mode
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar profile={profile} memberCount={memberCount} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          workspaceName={workspaceName}
          activeOrgId={orgId ?? undefined}
          userOrgs={userOrgs}
        />
        <main className="flex-1 overflow-y-auto app-grid-bg p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
