"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Gift, Loader2, Plus, Trash2 } from "lucide-react";
import {
  getCompedOrgs,
  grantCompAccess,
  revokeCompAccess,
  searchOrgs,
} from "@/actions/billing";
import type { Plan } from "@/lib/plans";

interface CompedOrg {
  orgId: string;
  orgName: string;
  plan: Plan;
  compedBy: string | null;
  compedReason: string | null;
  compedExpiresAt: string | null;
}

export function CompAccessSection() {
  const [comped, setComped] = useState<CompedOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<CompedOrg | null>(null);
  const [isPending, startTransition] = useTransition();

  // Grant form state
  const [orgQuery, setOrgQuery] = useState("");
  const [orgResults, setOrgResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [grantPlan, setGrantPlan] = useState<"pro" | "enterprise">("pro");
  const [grantReason, setGrantReason] = useState("");
  const [grantBy, setGrantBy] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [searching, setSearching] = useState(false);

  async function loadComped() {
    try {
      const data = await getCompedOrgs();
      setComped(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComped();
  }, []);

  // Org search with debounce
  useEffect(() => {
    if (orgQuery.length < 2) {
      setOrgResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchOrgs(orgQuery);
        setOrgResults(results);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [orgQuery]);

  function handleGrant() {
    if (!selectedOrg || !grantBy.trim()) return;

    startTransition(async () => {
      const result = await grantCompAccess({
        orgId: selectedOrg.id,
        plan: grantPlan,
        compedBy: grantBy.trim(),
        compedReason: grantReason.trim() || "N/A",
        compedExpiresAt: grantExpiry || null,
      });

      if (result.success) {
        toast.success(`Granted ${grantPlan} access to ${selectedOrg.name}`);
        setSheetOpen(false);
        resetForm();
        loadComped();
      } else {
        toast.error(result.error ?? "Failed to grant access");
      }
    });
  }

  function handleRevoke() {
    if (!revokeTarget) return;

    startTransition(async () => {
      const result = await revokeCompAccess(revokeTarget.orgId);
      if (result.success) {
        toast.success(`Revoked comp access for ${revokeTarget.orgName}`);
        setRevokeTarget(null);
        loadComped();
      } else {
        toast.error(result.error ?? "Failed to revoke");
      }
    });
  }

  function resetForm() {
    setOrgQuery("");
    setOrgResults([]);
    setSelectedOrg(null);
    setGrantPlan("pro");
    setGrantReason("");
    setGrantBy("");
    setGrantExpiry("");
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Comp Access
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setSheetOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Grant Access
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : comped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comped accounts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Org</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Plan</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">By</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Reason</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">Expires</th>
                    <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comped.map((c) => (
                    <tr key={c.orgId}>
                      <td className="py-2 pr-4 font-medium">{c.orgName}</td>
                      <td className="py-2 pr-4">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 capitalize">
                          {c.plan}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.compedBy ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{c.compedReason ?? "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground" suppressHydrationWarning>
                        {c.compedExpiresAt
                          ? new Date(c.compedExpiresAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-400 hover:text-red-300"
                          onClick={() => setRevokeTarget(c)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Access Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Grant Comp Access</SheetTitle>
            <SheetDescription>
              Give an org free access to a paid plan.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Org search */}
            <div className="space-y-2">
              <Label>Organization *</Label>
              {selectedOrg ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{selectedOrg.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setSelectedOrg(null);
                      setOrgQuery("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search by org name..."
                    value={orgQuery}
                    onChange={(e) => setOrgQuery(e.target.value)}
                  />
                  {searching && (
                    <p className="text-xs text-muted-foreground">Searching...</p>
                  )}
                  {orgResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {orgResults.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                          onClick={() => {
                            setSelectedOrg(org);
                            setOrgResults([]);
                          }}
                        >
                          {org.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Plan */}
            <div className="space-y-2">
              <Label>Plan *</Label>
              <Select value={grantPlan} onValueChange={(v) => setGrantPlan(v as "pro" | "enterprise")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Granted by */}
            <div className="space-y-2">
              <Label>Granted by *</Label>
              <Input
                placeholder="Your name"
                value={grantBy}
                onChange={(e) => setGrantBy(e.target.value)}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input
                placeholder="e.g. beta tester, referral partner"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label>Expires (leave empty for never)</Label>
              <Input
                type="date"
                value={grantExpiry}
                onChange={(e) => setGrantExpiry(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleGrant}
              disabled={!selectedOrg || !grantBy.trim() || isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Granting...
                </>
              ) : (
                "Grant Access"
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Revoke confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Comp Access</DialogTitle>
            <DialogDescription>
              This will downgrade <strong>{revokeTarget?.orgName}</strong> to the Free plan immediately. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
