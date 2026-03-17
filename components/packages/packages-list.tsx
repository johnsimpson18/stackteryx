"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  Package,
  Copy,
  Trash2,
  MoreHorizontal,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  deleteTierPackageAction,
  duplicateTierPackageAction,
} from "@/actions/tier-packages";
import type { TierPackageWithMeta } from "@/lib/types";

interface PackagesListProps {
  packages: TierPackageWithMeta[];
}

export function PackagesList({ packages }: PackagesListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  function handleDuplicate(packageId: string) {
    startTransition(async () => {
      const result = await duplicateTierPackageAction(packageId);
      if (result.success) {
        toast.success("Package duplicated");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setActiveMenu(null);
    });
  }

  function handleDelete(packageId: string) {
    startTransition(async () => {
      const result = await deleteTierPackageAction(packageId);
      if (result.success) {
        toast.success("Package deleted");
        router.refresh();
      } else {
        toast.error(result.error);
      }
      setActiveMenu(null);
    });
  }

  if (packages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 px-8">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
              <Layers className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Package your services into tiers
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Most MSPs sell services at three levels &mdash; a base package, a standard
              package, and a premium package. This lets clients choose what fits their
              budget while you upsell naturally.
            </p>
            <div className="mt-5 rounded-lg border border-border bg-card/60 px-5 py-4 w-full text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Example
              </p>
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p><span className="text-foreground font-medium">Essential</span> &rarr; EDR + Backup</p>
                <p><span className="text-foreground font-medium">Standard</span> &rarr; EDR + Backup + SIEM</p>
                <p><span className="text-foreground font-medium">Premium</span> &rarr; EDR + Backup + SIEM + Compliance Advisory</p>
              </div>
            </div>
            <Button asChild className="mt-5 gap-1.5">
              <Link href="/packages/new">
                Create your first package
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg) => (
        <Card
          key={pkg.id}
          className="group relative cursor-pointer transition-colors hover:border-primary/30"
          onClick={() => router.push(`/packages/${pkg.id}`)}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {pkg.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pkg.item_count} {pkg.item_count === 1 ? "tier" : "tiers"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={pkg.status as "draft" | "published" | "archived"} />
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === pkg.id ? null : pkg.id);
                    }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  {activeMenu === pkg.id && (
                    <div
                      className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-[#111111] shadow-lg py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={isPending}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        onClick={() => handleDuplicate(pkg.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {pkg.description && (
              <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                {pkg.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
