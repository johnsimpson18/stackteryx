"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  BUNDLE_TYPE_LABELS,
  BUNDLE_STATUS_LABELS,
  BUNDLE_TYPES,
} from "@/lib/constants";
import { archiveBundleAction } from "@/actions/bundles";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { hasPermission } from "@/lib/constants";
import { toast } from "sonner";
import { Eye, Pencil, Archive, Search, FileText } from "lucide-react";
import type { BundleWithMeta, UserRole, BundleType } from "@/lib/types";

interface BundleListProps {
  bundles: BundleWithMeta[];
  userRole: UserRole;
  enablementMap?: Record<
    string,
    { latestVersionId: string; needsEnablement: boolean }
  >;
}

function MarginBar({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.min(Math.max(margin, 0), 0.6) / 0.6 * 100;
  const color =
    margin >= 0.25 ? "bg-emerald-500" :
    margin >= 0.15 ? "bg-amber-500" :
    "bg-red-500";
  const textColor =
    margin >= 0.25 ? "text-emerald-400" :
    margin >= 0.15 ? "text-amber-400" :
    "text-red-400";
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="h-1 w-16 rounded-full bg-white/8 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-medium ${textColor}`}>
        {formatPercent(margin)}
      </span>
    </div>
  );
}

export function BundleList({ bundles, userRole, enablementMap = {} }: BundleListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  const filtered = bundles.filter((b) => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (typeFilter !== "all" && b.bundle_type !== typeFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  function handleArchive(id: string, name: string) {
    startTransition(async () => {
      const result = await archiveBundleAction(id);
      if (result.success) {
        toast.success(`"${name}" has been archived`);
      } else {
        toast.error(result.error);
      }
    });
  }

  const canEdit = hasPermission(userRole, "edit_bundles");
  const canArchive = hasPermission(userRole, "archive_bundles");

  function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {BUNDLE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {BUNDLE_TYPE_LABELS[t as BundleType]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} service{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        bundles.length === 0 ? (
          <EmptyState
            title="You haven't built any services yet."
            description="Start by defining the business outcome you want to deliver. The AI will help you build the rest."
            actionLabel="Build Your First Service"
            actionHref="/services/new"
          />
        ) : (
          <EmptyState
            title="No matching services"
            description="Try adjusting your search or filters."
            actionLabel="Clear filters"
            onAction={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); }}
          />
        )
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Configs</TableHead>
                <TableHead className="text-right">Latest MRR</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((bundle) => (
                <TableRow key={bundle.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/services/${bundle.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {bundle.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {BUNDLE_TYPE_LABELS[bundle.bundle_type]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={bundle.status} label={BUNDLE_STATUS_LABELS[bundle.status]} />
                  </TableCell>
                  <TableCell className="text-right">
                    {bundle.version_count}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {bundle.latest_mrr !== null
                      ? formatCurrency(bundle.latest_mrr)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <MarginBar margin={bundle.latest_margin} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                    {formatRelativeDate(bundle.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/services/${bundle.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/services/${bundle.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      {canArchive && bundle.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() =>
                            handleArchive(bundle.id, bundle.name)
                          }
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {enablementMap[bundle.id]?.needsEnablement && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/services/${bundle.id}/versions/${enablementMap[bundle.id].latestVersionId}?tab=enablement`}
                            title="Generate Sales Materials"
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
