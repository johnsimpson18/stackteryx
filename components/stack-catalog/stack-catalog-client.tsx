"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ToolForm } from "@/components/tools/tool-form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleGate } from "@/components/shared/role-gate";
import {
  CategoryBadge,
  StatusBadge,
  formatCost,
  getToolCostField,
} from "@/components/tools/tool-columns";
import { InlinePriceEditor } from "@/components/ui/inline-price-editor";
import { CATEGORY_LABELS, hasPermission } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { deactivateToolAction, updateToolCostAction } from "@/actions/tools";
import { toast } from "sonner";
import {
  Upload,
  Plus,
  Search,
  LayoutGrid,
  List,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Ban,
  Package,
  Library,
  Globe,
} from "lucide-react";
import { ToolLibraryModal } from "./tool-library-modal";
import { GlobalLibrarySheet } from "@/components/tools/global-library-sheet";
import type {
  ToolWithAssignments,
  DomainCoverage,
  RedundancyFlag,
  CoverageGap,
} from "@/lib/db/stack-catalog";
import type { GlobalToolEntry } from "@/actions/global-tool-library";
import type { UserRole, ToolCategory } from "@/lib/types";

// ── Props ────────────────────────────────────────────────────────────────────

interface StackCatalogClientProps {
  tools: ToolWithAssignments[];
  coverage: DomainCoverage[];
  coverageScore: number;
  redundancies: RedundancyFlag[];
  gaps: CoverageGap[];
  userRole: UserRole;
  globalTools: GlobalToolEntry[];
}

// ── Main Component ───────────────────────────────────────────────────────────

export function StackCatalogClient({
  tools,
  coverage,
  coverageScore,
  redundancies,
  gaps,
  userRole,
  globalTools,
}: StackCatalogClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"category" | "list">("category");
  const [search, setSearch] = useState("");
  const [showGaps, setShowGaps] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [globalLibraryOpen, setGlobalLibraryOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolWithAssignments | null>(null);
  const [, startTransition] = useTransition();

  const handleEditTool = (tool: ToolWithAssignments) => setEditingTool(tool);

  const existingToolNames = useMemo(
    () => new Set(tools.map((t) => t.name.toLowerCase())),
    [tools]
  );

  const activeTools = useMemo(
    () => tools.filter((t) => t.is_active),
    [tools]
  );

  const uniqueVendors = useMemo(
    () => new Set(activeTools.map((t) => t.vendor)).size,
    [activeTools]
  );

  // Build redundancy lookup by tool ID
  const redundantToolIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of redundancies) {
      for (const id of r.tool_ids) ids.add(id);
    }
    return ids;
  }, [redundancies]);

  function handleDeactivate(id: string, name: string) {
    startTransition(async () => {
      const result = await deactivateToolAction(id);
      if (result.success) {
        toast.success(`"${name}" deactivated`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setGlobalLibraryOpen(true)}>
          <Globe className="h-4 w-4 mr-2" />
          Browse Global Library
        </Button>
        <RoleGate role={userRole} permission="create_tools">
          <Button variant="outline" asChild>
            <Link href="/tools/upload">
              <Upload className="h-4 w-4 mr-2" />
              Import from Spreadsheet
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setLibraryOpen(true)}>
            <Library className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
          <Button asChild>
            <Link href="/tools/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Tool Manually
            </Link>
          </Button>
        </RoleGate>
      </div>

      {/* ── Coverage Score ── */}
      <CoverageScoreCard
        score={coverageScore}
        coveredCount={coverage.filter((c) => c.covered).length}
        totalDomains={coverage.length}
        totalTools={activeTools.length}
        uniqueVendors={uniqueVendors}
        redundancyCount={redundancies.length}
        gapCount={gaps.length}
        showGaps={showGaps}
        onToggleGaps={() => setShowGaps(!showGaps)}
      />

      {/* ── Gap Details Panel ── */}
      {showGaps && gaps.length > 0 && <GapDetailsPanel gaps={gaps} />}

      {/* ── Redundancy Alerts ── */}
      {redundancies.length > 0 && (
        <RedundancyAlerts redundancies={redundancies} />
      )}

      {/* ── View Toggle + Search ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools or vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant={showInactive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Showing All" : "Active Only"}
        </Button>

        <div className="flex items-center gap-1 ml-auto border border-border rounded-lg p-0.5">
          <Button
            variant={view === "category" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setView("category")}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Domains
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2.5"
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            List
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {tools.length === 0 ? (
        <EmptyState
          title="No tools in your catalog"
          description="Add tools to build your security coverage map."
          actionLabel="Add your first tool"
          actionHref="/tools/new"
        />
      ) : view === "category" ? (
        <CategoryView
          coverage={coverage}
          search={search}
          showInactive={showInactive}
          allTools={tools}
          redundantToolIds={redundantToolIds}
          userRole={userRole}
          onDeactivate={handleDeactivate}
          onEdit={handleEditTool}
        />
      ) : (
        <ListView
          tools={tools}
          search={search}
          showInactive={showInactive}
          redundantToolIds={redundantToolIds}
          userRole={userRole}
          onDeactivate={handleDeactivate}
          onEdit={handleEditTool}
        />
      )}

      {/* Global Tool Library Sheet */}
      <GlobalLibrarySheet
        open={globalLibraryOpen}
        onOpenChange={setGlobalLibraryOpen}
        globalTools={globalTools}
        existingToolNames={existingToolNames}
      />

      {/* Quick-add Tool Library Modal (local) */}
      <ToolLibraryModal
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        existingToolNames={existingToolNames}
      />

      {/* Tool Edit Sheet */}
      <Sheet open={!!editingTool} onOpenChange={(open) => !open && setEditingTool(null)}>
        <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Tool</SheetTitle>
          </SheetHeader>
          {editingTool && (
            <ToolForm
              tool={editingTool}
              onSuccess={() => {
                setEditingTool(null);
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Coverage Score Card ──────────────────────────────────────────────────────

function CoverageScoreCard({
  score,
  coveredCount,
  totalDomains,
  totalTools,
  uniqueVendors,
  redundancyCount,
  gapCount,
  showGaps,
  onToggleGaps,
}: {
  score: number;
  coveredCount: number;
  totalDomains: number;
  totalTools: number;
  uniqueVendors: number;
  redundancyCount: number;
  gapCount: number;
  showGaps: boolean;
  onToggleGaps: () => void;
}) {
  const scoreColor =
    score >= 80
      ? "text-emerald-400"
      : score >= 50
        ? "text-amber-400"
        : "text-red-400";

  const scoreBarColor =
    score >= 80
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                AI Coverage Score
              </h2>
              <p className="text-xs text-muted-foreground">
                {coveredCount} of {totalDomains} security domains covered
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
            <div
              className={cn("h-full rounded-full transition-all", scoreBarColor)}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{totalTools}</span>{" "}
              active tools
            </span>
            <span>
              <span className="font-medium text-foreground">
                {uniqueVendors}
              </span>{" "}
              vendors
            </span>
            {redundancyCount > 0 && (
              <span className="text-amber-400">
                {redundancyCount} redundanc
                {redundancyCount === 1 ? "y" : "ies"}
              </span>
            )}
          </div>
        </div>

        {/* Score display */}
        <div className="text-right flex-shrink-0">
          <p className={cn("text-4xl font-bold font-mono", scoreColor)}>
            {score}%
          </p>
          {gapCount > 0 && (
            <button
              onClick={onToggleGaps}
              className="text-xs text-primary hover:text-primary/80 transition-colors mt-1 flex items-center gap-0.5 ml-auto"
            >
              {gapCount} gap{gapCount !== 1 ? "s" : ""}
              {showGaps ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gap Details Panel ────────────────────────────────────────────────────────

function GapDetailsPanel({ gaps }: { gaps: CoverageGap[] }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-red-400" />
        <h3 className="text-sm font-semibold text-foreground">
          Coverage Gaps
        </h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gaps.map((gap) => (
          <div
            key={gap.domain}
            className="rounded-lg border border-red-500/10 bg-card/50 p-3"
          >
            <p className="text-sm font-medium text-foreground mb-1">
              {gap.domain}
            </p>
            <p className="text-xs text-muted-foreground">
              {gap.recommendation}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {gap.categories.map((cat) => (
                <span
                  key={cat}
                  className="text-[10px] rounded bg-white/5 px-1.5 py-0.5 text-muted-foreground"
                >
                  {CATEGORY_LABELS[cat]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Redundancy Alerts ────────────────────────────────────────────────────────

function RedundancyAlerts({
  redundancies,
}: {
  redundancies: RedundancyFlag[];
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">
          Redundancy Alerts
        </h3>
      </div>
      <div className="space-y-2">
        {redundancies.map((r, i) => (
          <div
            key={i}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
            <p>{r.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Category View ────────────────────────────────────────────────────────────

function CategoryView({
  coverage,
  search,
  showInactive,
  allTools,
  redundantToolIds,
  userRole,
  onDeactivate,
  onEdit,
}: {
  coverage: DomainCoverage[];
  search: string;
  showInactive: boolean;
  allTools: ToolWithAssignments[];
  redundantToolIds: Set<string>;
  userRole: UserRole;
  onDeactivate: (id: string, name: string) => void;
  onEdit: (tool: ToolWithAssignments) => void;
}) {
  // Categorized tools = tools with matching categories.
  // "Other" / uncategorized tools go into a virtual "Other" domain.
  const otherCategories = new Set<ToolCategory>();
  const domainCategorySet = new Set<ToolCategory>();
  for (const dc of coverage) {
    for (const cat of dc.domain.categories) domainCategorySet.add(cat);
  }
  for (const tool of allTools) {
    if (!domainCategorySet.has(tool.category)) {
      otherCategories.add(tool.category);
    }
  }

  return (
    <div className="space-y-4">
      {coverage.map((dc) => {
        const domainTools = filterTools(allTools, dc.domain.categories, search, showInactive);
        return (
          <DomainSection
            key={dc.domain.key}
            label={dc.domain.label}
            covered={dc.covered}
            tools={domainTools}
            redundantToolIds={redundantToolIds}
            userRole={userRole}
            onDeactivate={onDeactivate}
            onEdit={onEdit}
          />
        );
      })}

      {/* Other/uncategorized tools */}
      {otherCategories.size > 0 && (() => {
        const otherTools = filterTools(allTools, [...otherCategories], search, showInactive);
        if (otherTools.length === 0) return null;
        return (
          <DomainSection
            label="Other"
            covered={true}
            tools={otherTools}
            redundantToolIds={redundantToolIds}
            userRole={userRole}
            onDeactivate={onDeactivate}
            onEdit={onEdit}
          />
        );
      })()}
    </div>
  );
}

function filterTools(
  tools: ToolWithAssignments[],
  categories: ToolCategory[],
  search: string,
  showInactive: boolean
): ToolWithAssignments[] {
  return tools.filter((t) => {
    if (!categories.includes(t.category)) return false;
    if (!showInactive && !t.is_active) return false;
    if (
      search &&
      !t.name.toLowerCase().includes(search.toLowerCase()) &&
      !t.vendor.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });
}

function DomainSection({
  label,
  covered,
  tools,
  redundantToolIds,
  userRole,
  onDeactivate,
  onEdit,
}: {
  label: string;
  covered: boolean;
  tools: ToolWithAssignments[];
  redundantToolIds: Set<string>;
  userRole: UserRole;
  onDeactivate: (id: string, name: string) => void;
  onEdit: (tool: ToolWithAssignments) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        covered ? "border-border bg-card" : "border-red-500/20 bg-red-500/[0.02]"
      )}
    >
      {/* Domain header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              covered ? "bg-emerald-500" : "bg-red-500/40"
            )}
          />
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
          <span className="text-xs text-muted-foreground">
            {tools.length} tool{tools.length !== 1 ? "s" : ""}
          </span>
        </div>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Tool cards */}
      {!collapsed && (
        <div className="border-t border-border/50 p-3">
          {tools.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-4">
              No tools in this domain
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  isRedundant={redundantToolIds.has(tool.id)}
                  userRole={userRole}
                  onDeactivate={onDeactivate}
                  onEdit={onEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({
  tool,
  isRedundant,
  userRole,
  onDeactivate,
  onEdit,
}: {
  tool: ToolWithAssignments;
  isRedundant: boolean;
  userRole: UserRole;
  onDeactivate: (id: string, name: string) => void;
  onEdit: (tool: ToolWithAssignments) => void;
}) {
  const canEdit = hasPermission(userRole, "edit_tools");
  const canDeactivate = hasPermission(userRole, "deactivate_tools");

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isRedundant
          ? "border-amber-500/20 bg-amber-500/[0.03]"
          : "border-border/60 bg-white/[0.01]",
        !tool.is_active && "opacity-50"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {tool.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {tool.vendor}
          </p>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit(tool)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {canDeactivate && tool.is_active && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDeactivate(tool.id, tool.name)}
            >
              <Ban className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Category + Status */}
      <div className="flex items-center gap-1.5 mb-2">
        <CategoryBadge category={tool.category} />
        {!tool.is_active && <StatusBadge isActive={false} />}
        {isRedundant && (
          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="h-2.5 w-2.5" />
            Overlap
          </span>
        )}
      </div>

      {/* Cost */}
      <div className="text-xs text-muted-foreground mb-2">
        <ToolCostDisplay tool={tool} canEdit={canEdit} />
      </div>

      {/* Service assignments */}
      {tool.services.length > 0 && (
        <div className="border-t border-border/30 pt-2 mt-2">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">
            Assigned to
          </p>
          <div className="flex flex-wrap gap-1">
            {tool.services.map((svc) => (
              <Link
                key={svc.bundle_id}
                href={`/services/${svc.bundle_id}`}
                className="inline-flex items-center gap-1 rounded bg-primary/5 border border-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10 transition-colors"
              >
                <Package className="h-2.5 w-2.5" />
                {svc.bundle_name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── List View ────────────────────────────────────────────────────────────────

function ListView({
  tools,
  search,
  showInactive,
  redundantToolIds,
  userRole,
  onDeactivate,
  onEdit,
}: {
  tools: ToolWithAssignments[];
  search: string;
  showInactive: boolean;
  redundantToolIds: Set<string>;
  userRole: UserRole;
  onDeactivate: (id: string, name: string) => void;
  onEdit: (tool: ToolWithAssignments) => void;
}) {
  const filtered = tools.filter((t) => {
    if (!showInactive && !t.is_active) return false;
    if (
      search &&
      !t.name.toLowerCase().includes(search.toLowerCase()) &&
      !t.vendor.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const canEdit = hasPermission(userRole, "edit_tools");
  const canDeactivate = hasPermission(userRole, "deactivate_tools");

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No matching tools"
        description="Try adjusting your search or filters."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead>Name</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((tool) => (
            <TableRow
              key={tool.id}
              className={cn(
                "border-border/30 transition-colors",
                !tool.is_active && "opacity-50",
                redundantToolIds.has(tool.id) && "bg-amber-500/[0.02]"
              )}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground/90">
                    {tool.name}
                  </span>
                  {redundantToolIds.has(tool.id) && (
                    <AlertTriangle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {tool.vendor}
              </TableCell>
              <TableCell>
                <CategoryBadge category={tool.category} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <ToolCostDisplay tool={tool} canEdit={canEdit} />
              </TableCell>
              <TableCell>
                {tool.services.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tool.services.map((svc) => (
                      <Link
                        key={svc.bundle_id}
                        href={`/services/${svc.bundle_id}`}
                        className="inline-flex items-center gap-0.5 rounded bg-primary/5 border border-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10 transition-colors"
                      >
                        {svc.bundle_name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground/40">
                    Unassigned
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge isActive={tool.is_active} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(tool)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDeactivate && tool.is_active && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeactivate(tool.id, tool.name)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Inline-editable tool cost display ─────────────────────────────────────

function ToolCostDisplay({
  tool,
  canEdit,
}: {
  tool: ToolWithAssignments;
  canEdit: boolean;
}) {
  const costInfo = getToolCostField(tool);

  if (!costInfo || !costInfo.isEditable || !canEdit) {
    return <>{formatCost(tool)}</>;
  }

  return (
    <InlinePriceEditor
      value={costInfo.value}
      unit={costInfo.unit}
      fieldLabel={`${tool.name} cost`}
      onSave={async (newValue) => {
        const result = await updateToolCostAction(tool.id, costInfo.fieldName, newValue);
        if (result.success && tool.services.length > 0) {
          const names = tool.services.map((s) => s.bundle_name).join(", ");
          toast.info(`Affected services: ${names}`);
        }
        return result;
      }}
    />
  );
}
