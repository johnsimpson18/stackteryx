"use client";

import { useState, useTransition, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  CategoryBadge,
  PricingBadge,
  StatusBadge,
} from "./tool-columns";
import {
  TOOL_CATEGORIES,
  PRICING_MODELS,
  CATEGORY_LABELS,
  PRICING_MODEL_LABELS,
} from "@/lib/constants";
import {
  normalizeToMonthly,
  annotateNormalization,
} from "@/lib/pricing/engine";
import { formatCurrency } from "@/lib/formatting";
import { deactivateToolAction } from "@/actions/tools";
import { toast } from "sonner";
import { Pencil, Ban, Search, Wrench, Building2, DollarSign } from "lucide-react";
import type {
  Tool,
  UserRole,
  ToolCategory,
  PricingModel,
  PricingToolInput,
} from "@/lib/types";
import { hasPermission } from "@/lib/constants";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────────

const PREVIEW_ASSUMPTIONS = { endpoints: 30, users: 30, headcount: 30, org_count: 1 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function toolToPricingInput(tool: Tool): PricingToolInput {
  return {
    id: tool.id,
    name: tool.name,
    pricing_model: tool.pricing_model,
    per_seat_cost: Number(tool.per_seat_cost),
    flat_monthly_cost: Number(tool.flat_monthly_cost),
    tier_rules: tool.tier_rules ?? [],
    vendor_minimum_monthly: tool.vendor_minimum_monthly,
    labor_cost_per_seat: tool.labor_cost_per_seat,
    quantity_multiplier: 1,
    annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
    per_user_cost: Number(tool.per_user_cost ?? 0),
    per_org_cost: Number(tool.per_org_cost ?? 0),
    percent_discount: Number(tool.percent_discount ?? 0),
    flat_discount: Number(tool.flat_discount ?? 0),
    min_monthly_commit: tool.min_monthly_commit,
    tier_metric: tool.tier_metric,
  };
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatMini({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-white/[0.02] px-4 py-3 min-w-[150px]">
      <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-primary/70" />
      </div>
      <div>
        <p className="text-lg font-bold font-mono text-foreground leading-tight">
          {value}
        </p>
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wide leading-tight mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Normalized Cost Cell ──────────────────────────────────────────────────────

function NormalizedCostCell({ tool }: { tool: Tool }) {
  const input = toolToPricingInput(tool);
  const cost = normalizeToMonthly(input, PREVIEW_ASSUMPTIONS);
  const annotation = annotateNormalization(input, PREVIEW_ASSUMPTIONS);

  if (cost === 0) {
    return <span className="text-muted-foreground/30 text-xs">—</span>;
  }

  return (
    <div>
      <span className="font-mono text-sm text-foreground/90">
        {formatCurrency(cost)}
        <span className="text-muted-foreground/40 text-xs">/mo</span>
      </span>
      {annotation && (
        <p className="text-[10px] font-mono text-primary/60 mt-0.5">
          {annotation}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ToolListProps {
  tools: Tool[];
  userRole: UserRole;
}

export function ToolList({ tools, userRole }: ToolListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [pricingFilter, setPricingFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Stats (computed from all active tools, not filtered) ──
  const stats = useMemo(() => {
    const activeTools = tools.filter((t) => t.is_active);
    const uniqueVendors = new Set(activeTools.map((t) => t.vendor)).size;
    const totalCost = activeTools.reduce((sum, t) => {
      return sum + normalizeToMonthly(toolToPricingInput(t), PREVIEW_ASSUMPTIONS);
    }, 0);
    const avgCost = activeTools.length > 0 ? totalCost / activeTools.length : 0;
    return { count: activeTools.length, vendors: uniqueVendors, avgCost };
  }, [tools]);

  // ── Filtered list ──
  const filtered = tools.filter((tool) => {
    if (!showInactive && !tool.is_active) return false;

    if (
      search &&
      !tool.name.toLowerCase().includes(search.toLowerCase()) &&
      !tool.vendor.toLowerCase().includes(search.toLowerCase())
    )
      return false;

    if (categoryFilter !== "all" && tool.category !== categoryFilter)
      return false;

    if (pricingFilter !== "all" && tool.pricing_model !== pricingFilter)
      return false;

    return true;
  });

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

  const canEdit = hasPermission(userRole, "edit_tools");
  const canDeactivate = hasPermission(userRole, "deactivate_tools");

  return (
    <div className="space-y-5">
      {/* ── Summary Stats ── */}
      <div className="flex flex-wrap gap-3">
        <StatMini
          icon={Wrench}
          value={String(stats.count)}
          label="Active tools"
        />
        <StatMini
          icon={Building2}
          value={String(stats.vendors)}
          label="Vendors"
        />
        <StatMini
          icon={DollarSign}
          value={formatCurrency(stats.avgCost)}
          label="Avg cost @ 30 endpoints"
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools or vendors…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {TOOL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat as ToolCategory]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={pricingFilter} onValueChange={setPricingFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pricing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {PRICING_MODELS.map((model) => (
              <SelectItem key={model} value={model}>
                {PRICING_MODEL_LABELS[model as PricingModel]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showInactive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Showing All" : "Active Only"}
        </Button>

        <span className="text-sm text-muted-foreground/60 ml-auto">
          {filtered.length} tool{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table / Empty State ── */}
      {filtered.length === 0 ? (
        tools.length === 0 ? (
          <EmptyState
            title="Your stack is empty."
            description="Import your vendor tools from a spreadsheet or add them manually. Your stack powers every service you build."
            actionLabel="Add Tool Manually"
            actionHref="/tools/new"
          />
        ) : (
          <EmptyState
            title="No matching tools"
            description="Try adjusting your search or filters."
            actionLabel="Clear filters"
            onAction={() => { setSearch(""); setCategoryFilter("all"); setPricingFilter("all"); }}
          />
        )
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Name</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>
                  <span>Cost @ 30</span>
                  <span className="block text-[9px] text-muted-foreground/40 font-normal normal-case">
                    endpoints / users
                  </span>
                </TableHead>
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
                    !tool.is_active && "opacity-50"
                  )}
                >
                  <TableCell className="font-medium text-foreground/90">
                    {tool.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tool.vendor}
                  </TableCell>
                  <TableCell>
                    <CategoryBadge category={tool.category} />
                  </TableCell>
                  <TableCell>
                    <PricingBadge model={tool.pricing_model} />
                  </TableCell>
                  <TableCell>
                    <NormalizedCostCell tool={tool} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge isActive={tool.is_active} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                          <Link href={`/tools/${tool.id}/edit`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                      {canDeactivate && tool.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          disabled={isPending}
                          onClick={() => handleDeactivate(tool.id, tool.name)}
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
      )}
    </div>
  );
}
