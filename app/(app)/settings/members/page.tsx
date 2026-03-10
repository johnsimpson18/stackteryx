import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getOrgMembers } from "@/lib/db/org-members";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { MemberList } from "./member-list";

export default async function MembersPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) redirect("/login");

  const orgId = await getActiveOrgId();
  const members = orgId ? await getOrgMembers(orgId) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Manage organization members and roles"
      />
      <MemberList
        members={members}
        currentUserId={currentProfile.id}
      />
    </div>
  );
}
