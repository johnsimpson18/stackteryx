import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getApprovals } from "@/lib/db/approvals";
import { hasPermission } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/org-context";
import { PageHeader } from "@/components/shared/page-header";
import { ApprovalQueue } from "@/components/approvals/approval-queue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export default async function ApprovalsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!hasPermission(profile.role, "view_approvals")) redirect("/dashboard");

  const orgId = await getActiveOrgId();
  const approvals = await getApprovals(orgId ?? undefined, "all");

  const pending = approvals.filter((a) => a.status === "pending").length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.filter((a) => a.status === "rejected").length;

  const canManage = hasPermission(profile.role, "manage_approvals");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue"
        description="Review and approve discount requests that exceed your threshold"
      >
        {pending > 0 && (
          <Badge className="bg-amber-100 text-amber-700 border border-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {pending} pending
          </Badge>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={pending > 0 ? "border-amber-200 bg-amber-50/30" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className={`h-4 w-4 ${pending > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pending > 0 ? "text-amber-600" : ""}`}>
              {pending}
            </div>
            <p className="text-xs text-muted-foreground">
              {canManage ? "Needs your review" : "Awaiting review"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approved}</div>
            <p className="text-xs text-muted-foreground">Discounts greenlit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejected}</div>
            <p className="text-xs text-muted-foreground">Sent back for revision</p>
          </CardContent>
        </Card>
      </div>

      {approvals.length === 0 ? (
        <EmptyState
          title="No approval requests yet"
          description="When a bundle version is saved with a discount exceeding your threshold, an approval request will automatically appear here."
        />
      ) : (
        <ApprovalQueue approvals={approvals} canManage={canManage} />
      )}
    </div>
  );
}
