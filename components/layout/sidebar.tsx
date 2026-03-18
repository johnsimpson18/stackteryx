"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { NavGroup } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gift, LogOut, PanelLeftClose, PanelLeft, Zap, CreditCard } from "lucide-react";
import { signOut } from "@/actions/auth";
import type { Profile } from "@/lib/types";
import { useState, useTransition } from "react";
import { usePlanContext } from "@/components/providers/plan-provider";
import { useUpgradeModal } from "@/components/billing/upgrade-modal";
import { UsageBar } from "@/components/billing/usage-bar";
import { createBillingPortalSession } from "@/actions/billing";

interface SidebarProps {
  profile: Profile;
  memberCount?: number;
}

const ROLE_COLORS: Record<string, string> = {
  owner:   "bg-[#A8FF3E]/10 text-[#A8FF3E] border border-[#A8FF3E]/20",
  finance: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  sales:   "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  viewer:  "bg-[#555]/10 text-[#999] border border-[#555]/20",
};

const GROUP_ORDER: NavGroup[] = ["primary", "secondary"];

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { plan, loading, comped, isTrial, trialDaysRemaining, trialUrgency } = usePlanContext();
  const { openUpgradeModal } = useUpgradeModal();
  const [billingPending, startBillingTransition] = useTransition();

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  // Filter items by role + context, then group
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.href === "/admin") return profile.role === "owner";
    return true;
  });

  const grouped = new Map<NavGroup, typeof NAV_ITEMS[number][]>();
  for (const group of GROUP_ORDER) {
    grouped.set(group, []);
  }
  for (const item of visibleItems) {
    grouped.get(item.group)!.push(item);
  }

  function handleManageBilling() {
    startBillingTransition(async () => {
      try {
        const result = await createBillingPortalSession();
        if ("error" in result) {
          // No billing account — open upgrade modal instead
          openUpgradeModal();
          return;
        }
        window.location.href = result.url;
      } catch {
        // Network or auth error
      }
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center min-w-0">
            <Image src="/stackteryx-logo.svg" alt="Stackteryx" width={130} height={28} priority />
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <Image src="/favicon.svg" alt="Stackteryx" width={24} height={24} priority />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5 flex-shrink-0"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
        {GROUP_ORDER.map((group) => {
          const items = grouped.get(group)!;
          if (items.length === 0) return null;

          return (
            <div key={group}>
              {/* Divider for secondary group */}
              {group !== "primary" && (
                <div className="mx-2 my-2 h-px bg-sidebar-border" />
              )}

              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                     pathname.startsWith(item.href + "/"));
                  const Icon = item.icon;

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground/50 cursor-not-allowed select-none",
                          collapsed && "justify-center px-2"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-40" />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                      </div>
                    );
                  }

                  const hasAccent = "accent" in item && item.accent;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : hasAccent
                            ? "text-primary hover:bg-primary/10 hover:text-primary/80"
                            : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      {/* Active left-edge indicator */}
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isActive ? "text-primary" : hasAccent ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <div className="px-2 pb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-8 w-8 mx-auto flex text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Plan badge */}
      {!collapsed && !loading && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="rounded-lg border border-sidebar-border p-2.5 space-y-2">
            {isTrial ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
                    style={{
                      backgroundColor: trialUrgency === "high" ? "rgba(226,75,74,0.1)" : trialUrgency === "medium" ? "rgba(239,159,39,0.1)" : "rgba(200,241,53,0.1)",
                      color: trialUrgency === "high" ? "#e24b4a" : trialUrgency === "medium" ? "#EF9F27" : "#c8f135",
                      borderColor: trialUrgency === "high" ? "rgba(226,75,74,0.2)" : trialUrgency === "medium" ? "rgba(239,159,39,0.2)" : "rgba(200,241,53,0.2)",
                    }}
                  >
                    {trialUrgency === "none" || trialUrgency === "low"
                      ? `Free Trial \u00B7 ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} left`
                      : `\u26A1 Trial ending soon \u00B7 ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""}`}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, ((7 - trialDaysRemaining) / 7) * 100)}%`,
                      backgroundColor: trialDaysRemaining <= 1 ? "#e24b4a" : trialDaysRemaining <= 2 ? "#EF9F27" : "#c8f135",
                    }}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground/60" style={{ fontFamily: "var(--font-mono-alt)" }}>
                  Day {7 - trialDaysRemaining + 1} of 7
                </p>
                {trialUrgency === "none" || trialUrgency === "low" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px] text-primary hover:text-primary"
                    onClick={() => openUpgradeModal()}
                  >
                    Upgrade when ready
                  </Button>
                ) : (
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-[10px] text-primary hover:text-primary"
                      onClick={() => openUpgradeModal()}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Upgrade to Pro &mdash; $149/mo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-6 text-[9px] text-muted-foreground hover:text-foreground"
                      onClick={() => openUpgradeModal()}
                    >
                      Upgrade to Enterprise &rarr;
                    </Button>
                  </div>
                )}
              </>
            ) : plan === "enterprise" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(90,158,0,0.1)", color: "#5a9e00", borderColor: "rgba(90,158,0,0.2)" }}>
                    Enterprise Plan
                  </span>
                  <span style={{ color: "#5a9e00" }} className="text-[10px]">&#10003;</span>
                  {comped && <Gift className="h-3 w-3 text-amber-400" />}
                </div>
                {!comped && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px]"
                    onClick={handleManageBilling}
                    disabled={billingPending}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Manage Billing
                  </Button>
                )}
              </>
            ) : plan === "pro" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border" style={{ backgroundColor: "rgba(90,158,0,0.1)", color: "#5a9e00", borderColor: "rgba(90,158,0,0.2)" }}>
                    Pro Plan
                  </span>
                  <span style={{ color: "#5a9e00" }} className="text-[10px]">&#10003;</span>
                  {comped && <Gift className="h-3 w-3 text-amber-400" />}
                </div>
                <UsageBar limitKey="aiGenerationsPerMonth" compact showLabel />
                {!comped && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-[10px]"
                    onClick={handleManageBilling}
                    disabled={billingPending}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Manage Billing
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Free Plan
                  </span>
                </div>
                <UsageBar limitKey="aiGenerationsPerMonth" compact showLabel />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-[10px] text-primary hover:text-primary"
                  onClick={() => openUpgradeModal()}
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Upgrade to Pro
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-sidebar-border p-2 flex-shrink-0">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2 py-2",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="bg-[#A8FF3E]/10 text-[#A8FF3E] text-[10px] font-bold border border-[#A8FF3E]/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-foreground/90">
                  {profile.display_name}
                </p>
                <span
                  className={cn(
                    "inline-block text-[9px] px-1.5 py-0.5 rounded-md font-medium capitalize mt-0.5",
                    ROLE_COLORS[profile.role] ?? ROLE_COLORS.viewer
                  )}
                >
                  {profile.role}
                </span>
              </div>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-white/5 flex-shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
