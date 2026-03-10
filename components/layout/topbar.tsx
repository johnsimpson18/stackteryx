"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "./breadcrumbs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchOrgAction } from "@/actions/orgs";
import { ChevronsUpDown } from "lucide-react";

interface TopbarProps {
  workspaceName: string;
  activeOrgId?: string;
  userOrgs?: { org_id: string; org_name: string }[];
}

export function Topbar({ workspaceName, activeOrgId, userOrgs = [] }: TopbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasMultipleOrgs = userOrgs.length > 1;

  function handleOrgSwitch(orgId: string) {
    if (orgId === activeOrgId) return;
    startTransition(async () => {
      await switchOrgAction(orgId);
      router.refresh();
    });
  }

  return (
    <header className="relative flex h-12 items-center justify-between border-b border-border bg-background/60 px-5 backdrop-blur-md flex-shrink-0">
      {/* Subtle bottom glow line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <Breadcrumbs />
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-[#A8FF3E] shadow-[0_0_6px_2px_rgba(168,255,62,0.4)]" />
        {hasMultipleOrgs ? (
          <Select
            value={activeOrgId}
            onValueChange={handleOrgSwitch}
            disabled={isPending}
          >
            <SelectTrigger className="h-7 border-0 bg-transparent text-xs text-muted-foreground font-medium shadow-none hover:text-foreground transition-colors gap-1 px-1.5 min-w-0">
              <SelectValue />
              <ChevronsUpDown className="h-3 w-3 opacity-50" />
            </SelectTrigger>
            <SelectContent align="end">
              {userOrgs.map((org) => (
                <SelectItem key={org.org_id} value={org.org_id}>
                  {org.org_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-muted-foreground font-medium">
            {workspaceName}
          </span>
        )}
      </div>
    </header>
  );
}
