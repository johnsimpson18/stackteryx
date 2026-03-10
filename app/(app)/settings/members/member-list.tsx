"use client";

import { useState, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { changeRoleAction, removeMemberAction, inviteMemberAction } from "@/actions/members";
import { hasOrgPermission } from "@/lib/constants";
import { toast } from "sonner";
import { UserMinus } from "lucide-react";
import type { OrgMemberWithProfile, OrgRole } from "@/lib/types";

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  org_owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

interface MemberListProps {
  members: OrgMemberWithProfile[];
  currentUserId: string;
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("viewer");

  const currentMember = members.find((m) => m.user_id === currentUserId);
  const canManage = currentMember
    ? hasOrgPermission(currentMember.role, "manage_members")
    : false;

  function handleRoleChange(userId: string, role: OrgRole) {
    startTransition(async () => {
      const result = await changeRoleAction(userId, role);
      if (result.success) {
        toast.success("Role updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemove(userId: string, name: string) {
    startTransition(async () => {
      const result = await removeMemberAction(userId);
      if (result.success) {
        toast.success(`${name} has been removed`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteMemberAction(inviteEmail, inviteRole);
      if (result.success) {
        toast.success(`Invitation recorded for ${inviteEmail}`);
        setInviteEmail("");
      } else {
        toast.error(result.error);
      }
    });
  }

  const activeMembers = members.filter((m) => m.is_active);

  return (
    <div className="space-y-6">
      {/* Invite form - only for owners/admins */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@yourmsp.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as OrgRole)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="org_owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "..." : "Invite"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Note: Email sending is not yet implemented. The invitation is
              recorded in the audit log.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Member list */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canManage && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeMembers.map((member) => {
              const initials = member.display_name
                ? member.display_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "??";

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#A8FF3E]/10 text-[#A8FF3E] text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.display_name || "Unnamed"}
                        </p>
                        {member.user_id === currentUserId && (
                          <span className="text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {canManage && member.user_id !== currentUserId ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.user_id, v as OrgRole)
                        }
                        disabled={isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="org_owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="capitalize">
                        {ORG_ROLE_LABELS[member.role]}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.is_active ? "default" : "secondary"}
                      className={
                        member.is_active
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : ""
                      }
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {member.user_id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() =>
                            handleRemove(member.user_id, member.display_name)
                          }
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
