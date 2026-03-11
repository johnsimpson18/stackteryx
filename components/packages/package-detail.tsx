"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { BUNDLE_TYPE_LABELS, CATEGORY_LABELS } from "@/lib/constants";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit2,
  Layers,
  Loader2,
  Package,
  Star,
  Trash2,
} from "lucide-react";
import {
  updateTierPackageAction,
  saveTierPackageItemsAction,
  publishTierPackageAction,
  archiveTierPackageAction,
  deleteTierPackageAction,
  duplicateTierPackageAction,
} from "@/actions/tier-packages";
import type {
  TierPackageWithItems,
  TierPackageItemWithBundle,
  BundleVersionWithTools,
  ServiceOutcome,
  UserRole,
  BundleType,
  ToolCategory,
} from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface BundleDetailData {
  version: BundleVersionWithTools | null;
  outcome: ServiceOutcome | null;
}

interface PackageDetailProps {
  pkg: TierPackageWithItems;
  bundleDetails: Record<string, BundleDetailData>;
  activeBundles: {
    id: string;
    name: string;
    bundle_type: BundleType;
    latest_mrr: number | null;
  }[];
  userRole: UserRole;
}

type Tab = "overview" | "comparison";

// ── Component ────────────────────────────────────────────────────────────────

export function PackageDetail({
  pkg,
  bundleDetails,
  activeBundles,
  userRole,
}: PackageDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(pkg.name);
  const [editDescription, setEditDescription] = useState(pkg.description);
  const comparisonRef = useRef<HTMLDivElement>(null);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleSaveInfo() {
    startTransition(async () => {
      const result = await updateTierPackageAction(pkg.id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      if (result.success) {
        toast.success("Package updated");
        setIsEditing(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handlePublish() {
    startTransition(async () => {
      const result = await publishTierPackageAction(pkg.id);
      if (result.success) {
        toast.success("Package published");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveTierPackageAction(pkg.id);
      if (result.success) {
        toast.success("Package archived");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTierPackageAction(pkg.id);
      if (result.success) {
        toast.success("Package duplicated");
        router.push(`/packages/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTierPackageAction(pkg.id);
      if (result.success) {
        toast.success("Package deleted");
        router.push("/packages");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleExportPdf() {
    if (!comparisonRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${pkg.name} — Tier Comparison</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
            th { background: #f5f5f5; font-weight: 600; }
            .highlight { background: #f0fdf4; }
            .tier-label { font-weight: 600; font-size: 14px; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>${pkg.name}</h1>
          <p class="subtitle">${pkg.description || "Service tier comparison"}</p>
          ${comparisonRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/packages")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-bold tracking-tight text-foreground"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {pkg.name}
              </h1>
              <StatusBadge
                status={pkg.status as "draft" | "published" | "archived"}
              />
            </div>
            {pkg.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {pkg.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {pkg.status === "draft" && (
            <Button
              onClick={handlePublish}
              disabled={isPending || pkg.items.length === 0}
              size="sm"
              className="gap-2"
            >
              <Check className="h-3.5 w-3.5" />
              Publish
            </Button>
          )}
          {pkg.status === "published" && (
            <Button
              onClick={handleArchive}
              disabled={isPending}
              variant="outline"
              size="sm"
            >
              Archive
            </Button>
          )}
          <Button
            onClick={handleDuplicate}
            disabled={isPending}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </Button>
          <Button
            onClick={handleDelete}
            disabled={isPending}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "overview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("comparison")}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            tab === "comparison"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Comparison Table
        </button>
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          pkg={pkg}
          bundleDetails={bundleDetails}
          isEditing={isEditing}
          editName={editName}
          editDescription={editDescription}
          isPending={isPending}
          onEditNameChange={setEditName}
          onEditDescriptionChange={setEditDescription}
          onStartEdit={() => setIsEditing(true)}
          onCancelEdit={() => {
            setIsEditing(false);
            setEditName(pkg.name);
            setEditDescription(pkg.description);
          }}
          onSaveInfo={handleSaveInfo}
        />
      )}

      {tab === "comparison" && (
        <ComparisonTab
          pkg={pkg}
          bundleDetails={bundleDetails}
          comparisonRef={comparisonRef}
          onExportPdf={handleExportPdf}
        />
      )}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  pkg,
  bundleDetails,
  isEditing,
  editName,
  editDescription,
  isPending,
  onEditNameChange,
  onEditDescriptionChange,
  onStartEdit,
  onCancelEdit,
  onSaveInfo,
}: {
  pkg: TierPackageWithItems;
  bundleDetails: Record<string, BundleDetailData>;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  isPending: boolean;
  onEditNameChange: (v: string) => void;
  onEditDescriptionChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveInfo: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Package info card */}
      <Card>
        <CardContent className="p-5">
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => onEditDescriptionChange(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveInfo} disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Package Details
                </h3>
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>
                    {pkg.items.length}{" "}
                    {pkg.items.length === 1 ? "tier" : "tiers"} configured
                  </p>
                  <p>
                    Created{" "}
                    {new Date(pkg.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onStartEdit}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier cards */}
      {pkg.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tiers configured yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pkg.items.map((item) => {
            const detail = bundleDetails[item.bundle_id];
            const version = detail?.version;
            const outcome = detail?.outcome;
            const toolCount = version?.tools?.length ?? 0;
            const mrr = version?.computed_mrr
              ? Number(version.computed_mrr)
              : null;
            const margin = version?.computed_margin_post_discount
              ? Number(version.computed_margin_post_discount)
              : null;

            return (
              <Card
                key={item.id}
                className={cn(
                  "relative transition-colors",
                  item.highlight && "border-primary/30"
                )}
              >
                {item.highlight && (
                  <div className="absolute -top-2.5 left-4">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0">
                      Recommended
                    </Badge>
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">
                      {item.tier_label}
                    </h4>
                    {mrr != null && (
                      <span className="text-sm font-mono text-primary">
                        {formatCurrency(mrr)}
                        <span className="text-xs text-muted-foreground">
                          /mo
                        </span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {item.bundle_name}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {BUNDLE_TYPE_LABELS[item.bundle_type]}
                    </Badge>
                    {toolCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {toolCount} tools
                      </Badge>
                    )}
                    {margin != null && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          margin >= 0.3
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : margin >= 0.15
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}
                      >
                        {formatPercent(margin)} margin
                      </Badge>
                    )}
                  </div>

                  {outcome?.outcome_statement && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border">
                      {outcome.outcome_statement}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Comparison Tab ───────────────────────────────────────────────────────────

function ComparisonTab({
  pkg,
  bundleDetails,
  comparisonRef,
  onExportPdf,
}: {
  pkg: TierPackageWithItems;
  bundleDetails: Record<string, BundleDetailData>;
  comparisonRef: React.RefObject<HTMLDivElement | null>;
  onExportPdf: () => void;
}) {
  if (pkg.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Add tiers to see the comparison table.
        </CardContent>
      </Card>
    );
  }

  // Collect all unique tool categories across tiers
  const allCategories = new Set<ToolCategory>();
  const tierToolSets: Record<string, Set<string>> = {};

  for (const item of pkg.items) {
    const version = bundleDetails[item.bundle_id]?.version;
    const tools = version?.tools ?? [];
    const categorySet = new Set<string>();
    for (const t of tools) {
      if (t.tool) {
        allCategories.add(t.tool.category);
        categorySet.add(t.tool.category);
      }
    }
    tierToolSets[item.bundle_id] = categorySet;
  }

  const sortedCategories = Array.from(allCategories).sort();

  // Comparison rows: Pricing, Margin, Tools count, then each category
  const comparisonRows: {
    label: string;
    values: (string | { text: string; included: boolean })[];
  }[] = [];

  // MRR row
  comparisonRows.push({
    label: "Monthly Price",
    values: pkg.items.map((item) => {
      const v = bundleDetails[item.bundle_id]?.version;
      return v?.computed_mrr
        ? formatCurrency(Number(v.computed_mrr))
        : "—";
    }),
  });

  // Margin row
  comparisonRows.push({
    label: "Margin",
    values: pkg.items.map((item) => {
      const v = bundleDetails[item.bundle_id]?.version;
      return v?.computed_margin_post_discount
        ? formatPercent(Number(v.computed_margin_post_discount))
        : "—";
    }),
  });

  // Tool count row
  comparisonRows.push({
    label: "Tools Included",
    values: pkg.items.map((item) => {
      const v = bundleDetails[item.bundle_id]?.version;
      return `${v?.tools?.length ?? 0}`;
    }),
  });

  // Category rows
  for (const cat of sortedCategories) {
    const label = CATEGORY_LABELS[cat] ?? cat;
    comparisonRows.push({
      label,
      values: pkg.items.map((item) => {
        const included = tierToolSets[item.bundle_id]?.has(cat) ?? false;
        const version = bundleDetails[item.bundle_id]?.version;
        const tool = version?.tools?.find((t) => t.tool?.category === cat);
        return {
          text: tool?.tool?.name ?? "",
          included,
        };
      }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onExportPdf}
        >
          <Download className="h-3.5 w-3.5" />
          Export / Print
        </Button>
      </div>

      <div ref={comparisonRef}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 border-b border-border text-xs font-medium text-muted-foreground w-[180px]">
                  Feature
                </th>
                {pkg.items.map((item) => (
                  <th
                    key={item.id}
                    className={cn(
                      "text-center p-3 border-b border-border",
                      item.highlight && "bg-primary/5"
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">
                      {item.tier_label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.bundle_name}
                    </div>
                    {item.highlight && (
                      <Badge className="mt-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
                        Recommended
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="p-3 text-xs font-medium text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((val, i) => {
                    const item = pkg.items[i];
                    if (typeof val === "string") {
                      return (
                        <td
                          key={i}
                          className={cn(
                            "text-center p-3 text-xs",
                            item.highlight && "bg-primary/5"
                          )}
                        >
                          <span className="font-mono text-foreground">
                            {val}
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={i}
                        className={cn(
                          "text-center p-3",
                          item.highlight && "bg-primary/5"
                        )}
                      >
                        {val.included ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            {val.text && (
                              <span className="text-xs text-muted-foreground">
                                {val.text}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
