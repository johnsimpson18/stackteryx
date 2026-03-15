"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Check,
  X,
  ChevronLeft,
  Package,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Plus,
  FlaskConical,
} from "lucide-react";
import {
  computeBundleCost,
  computeSellPrice,
  normalizeToMonthly,
  annotateNormalization,
} from "@/lib/pricing/engine";
import { createVersionAction } from "@/actions/bundles";
import { createScenarioAction, deleteScenarioAction } from "@/actions/scenarios";
import { toast } from "sonner";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { CATEGORY_LABELS, PRICING_MODEL_LABELS } from "@/lib/constants";
import type { OrgSettings } from "@/lib/db/org-settings";
import type {
  Tool,
  BundleAssumptions,
  SellConfig,
  SellStrategy,
  PricingToolInput,
  ScenarioInputs,
} from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toolToPricingInput(tool: Tool): PricingToolInput {
  return {
    id: tool.id,
    name: tool.name,
    pricing_model: tool.pricing_model,
    per_seat_cost: Number(tool.per_seat_cost ?? 0),
    flat_monthly_cost: Number(tool.flat_monthly_cost ?? 0),
    tier_rules: tool.tier_rules ?? [],
    vendor_minimum_monthly: tool.vendor_minimum_monthly
      ? Number(tool.vendor_minimum_monthly)
      : null,
    labor_cost_per_seat: null,
    quantity_multiplier: 1,
    annual_flat_cost: Number(tool.annual_flat_cost ?? 0),
    per_user_cost: Number(tool.per_user_cost ?? 0),
    per_org_cost: Number(tool.per_org_cost ?? 0),
    percent_discount: Number(tool.percent_discount ?? 0),
    flat_discount: Number(tool.flat_discount ?? 0),
    min_monthly_commit: tool.min_monthly_commit
      ? Number(tool.min_monthly_commit)
      : null,
    tier_metric: tool.tier_metric,
  };
}

function scenarioToAssumptions(s: ScenarioInputs): BundleAssumptions {
  return {
    endpoints: s.endpoints,
    users: s.users,
    headcount: s.headcount,
    org_count: s.org_count,
    sites: s.sites,
  };
}

type ToolFilter = "all" | "per_seat" | "per_user" | "annual_flat" | "flat";

const FILTER_LABELS: Record<ToolFilter, string> = {
  all: "All",
  per_seat: "Endpoint",
  per_user: "Per User",
  annual_flat: "Annual",
  flat: "Flat / Org",
};

const DEFAULT_ASSUMPTIONS: BundleAssumptions = {
  endpoints: 30,
  users: 30,
  headcount: 30,
  org_count: 1,
  sites: 1,
};

const DEFAULT_SELL_CONFIG: SellConfig = {
  strategy: "cost_plus_margin",
  target_margin_pct: 0.35,
};

function marginColor(pct: number): string {
  if (pct >= 0.3) return "text-emerald-400";
  if (pct >= 0.15) return "text-amber-400";
  return "text-red-400";
}

function marginBg(pct: number): string {
  if (pct >= 0.3) return "bg-emerald-500/10 border-emerald-500/20";
  if (pct >= 0.15) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VersionBuilderProps {
  bundleId: string;
  bundleName: string;
  tools: Tool[];
  settings: OrgSettings;
  savedScenarios: ScenarioInputs[];
}

export function VersionBuilder({
  bundleId,
  bundleName,
  tools,
  settings,
  savedScenarios,
}: VersionBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingScenario, startScenarioTransition] = useTransition();

  // Core state
  const [name, setName] = useState(`${bundleName} — New Version`);
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [assumptions, setAssumptions] =
    useState<BundleAssumptions>(DEFAULT_ASSUMPTIONS);
  const [sellConfig, setSellConfig] = useState<SellConfig>(DEFAULT_SELL_CONFIG);
  const [assumptionsOpen, setAssumptionsOpen] = useState(true);

  // Scenario management
  const [scenarios, setScenarios] = useState<ScenarioInputs[]>(savedScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    savedScenarios.find((s) => s.is_default)?.id ?? null
  );
  const [showNewScenario, setShowNewScenario] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");

  // Tool library state
  const [search, setSearch] = useState("");
  const [toolFilter, setToolFilter] = useState<ToolFilter>("all");

  // ── Live calculations ────────────────────────────────────────────────────────

  const bundleCost = useMemo(
    () => computeBundleCost(selectedTools.map(toolToPricingInput), assumptions),
    [selectedTools, assumptions]
  );

  const sellResult = useMemo(
    () => computeSellPrice(bundleCost.totalMonthlyCost, sellConfig, assumptions),
    [bundleCost.totalMonthlyCost, sellConfig, assumptions]
  );

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedToolIds = useMemo(
    () => new Set(selectedTools.map((t) => t.id)),
    [selectedTools]
  );

  const totalCategories = useMemo(
    () => new Set(selectedTools.map((t) => t.category)).size,
    [selectedTools]
  );

  const filteredLibrary = useMemo(() => {
    let result = tools.filter((t) => t.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.vendor.toLowerCase().includes(q)
      );
    }
    switch (toolFilter) {
      case "per_seat":
        result = result.filter(
          (t) =>
            t.pricing_model === "per_seat" ||
            t.pricing_model === "tiered" ||
            t.pricing_model === "tiered_by_metric"
        );
        break;
      case "per_user":
        result = result.filter((t) => t.pricing_model === "per_user");
        break;
      case "annual_flat":
        result = result.filter((t) => t.pricing_model === "annual_flat");
        break;
      case "flat":
        result = result.filter(
          (t) =>
            t.pricing_model === "flat_monthly" || t.pricing_model === "per_org"
        );
        break;
    }
    return result;
  }, [tools, search, toolFilter]);

  const canSave =
    name.trim().length > 0 &&
    selectedTools.length > 0 &&
    sellResult.sellPriceMonthly > 0;

  // ── Scenario actions ─────────────────────────────────────────────────────────

  const loadScenario = useCallback(
    (scenario: ScenarioInputs) => {
      setActiveScenarioId(scenario.id);
      setAssumptions(scenarioToAssumptions(scenario));
      if (
        scenario.sell_config &&
        typeof scenario.sell_config === "object" &&
        "strategy" in scenario.sell_config
      ) {
        setSellConfig(scenario.sell_config as SellConfig);
      }
    },
    []
  );

  function saveAsScenario() {
    if (!newScenarioName.trim()) return;
    startScenarioTransition(async () => {
      const result = await createScenarioAction({
        bundle_id: bundleId,
        name: newScenarioName.trim(),
        endpoints: assumptions.endpoints,
        users: assumptions.users,
        headcount: assumptions.headcount ?? assumptions.endpoints,
        org_count: assumptions.org_count,
        contract_term_months: 12,
        sites: assumptions.sites ?? 1,
        sell_config: sellConfig,
        is_default: scenarios.length === 0,
      });
      if (result.success) {
        setScenarios((prev) => [...prev, result.data]);
        setActiveScenarioId(result.data.id);
        setNewScenarioName("");
        setShowNewScenario(false);
        toast.success(`Scenario "${result.data.name}" saved`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function removeScenario(scenario: ScenarioInputs) {
    startScenarioTransition(async () => {
      const result = await deleteScenarioAction(scenario.id, bundleId);
      if (result.success) {
        setScenarios((prev) => prev.filter((s) => s.id !== scenario.id));
        if (activeScenarioId === scenario.id) setActiveScenarioId(null);
        toast.success("Scenario removed");
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Tool actions ─────────────────────────────────────────────────────────────

  function addTool(tool: Tool) {
    if (!selectedToolIds.has(tool.id)) {
      setSelectedTools((prev) => [...prev, tool]);
    }
  }

  function removeTool(toolId: string) {
    setSelectedTools((prev) => prev.filter((t) => t.id !== toolId));
  }

  function changeStrategy(strategy: SellStrategy) {
    setSellConfig((prev) => ({
      ...prev,
      strategy,
      target_margin_pct: prev.target_margin_pct ?? 0.35,
      monthly_flat_price: prev.monthly_flat_price ?? 0,
      per_endpoint_sell_price: prev.per_endpoint_sell_price ?? 0,
      per_user_sell_price: prev.per_user_sell_price ?? 0,
    }));
  }

  function handleSave() {
    startTransition(async () => {
      const marginForLegacy =
        sellConfig.strategy === "cost_plus_margin"
          ? (sellConfig.target_margin_pct ?? 0.35)
          : Number(settings.default_target_margin_pct);

      const result = await createVersionAction(bundleId, {
        seat_count: assumptions.endpoints,
        risk_tier: "medium",
        contract_term_months: 12,
        target_margin_pct: marginForLegacy,
        overhead_pct: Number(settings.default_overhead_pct),
        labor_pct: Number(settings.default_labor_pct),
        discount_pct: 0,
        notes: "",
        tools: selectedTools.map((t) => ({ tool_id: t.id, quantity_multiplier: 1 })),
        sell_strategy: sellConfig.strategy,
        sell_config: sellConfig as unknown as Record<string, unknown>,
        assumptions: assumptions as unknown as Record<string, unknown>,
      });

      if (result.success) {
        toast.success(`Version v${result.data.version.version_number} saved`);
        router.push(`/services/${bundleId}/versions/${result.data.version.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden -m-6">
        {/* ── Top header bar ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border bg-background/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(`/services/${bundleId}`)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-mono truncate hidden sm:block">
              {bundleName}
            </span>
            <span className="text-muted-foreground/40 hidden sm:block">/</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Version name…"
              className="bg-transparent text-sm font-semibold text-foreground border-none outline-none placeholder:text-muted-foreground/50 min-w-[200px]"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {selectedTools.length > 0 && (
              <span className="text-xs text-muted-foreground hidden md:block">
                {selectedTools.length} tool{selectedTools.length !== 1 ? "s" : ""} ·{" "}
                {formatCurrency(bundleCost.totalMonthlyCost)}/mo cost
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave || isPending}
              className="gap-1.5"
            >
              {isPending ? "Saving…" : "Save Pricing Version"}
            </Button>
          </div>
        </div>

        {/* ── 3-column body ────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Column 1: Tool Library ───────────────────────────────────── */}
          <div className="w-[300px] shrink-0 border-r border-border flex flex-col overflow-hidden bg-white/[0.01]">
            <div className="px-4 pt-4 pb-3 space-y-3 shrink-0">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tool Library
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tools…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-white/[0.03] border-border"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(FILTER_LABELS) as [ToolFilter, string][]).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setToolFilter(key)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors border ${
                        toolFilter === key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white/[0.04] text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {filteredLibrary.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No tools match your filter
                </p>
              ) : (
                filteredLibrary.map((tool) => {
                  const pInput = toolToPricingInput(tool);
                  const cost = normalizeToMonthly(pInput, assumptions);
                  const annotation = annotateNormalization(pInput, assumptions);
                  const isSelected = selectedToolIds.has(tool.id);

                  return (
                    <ToolLibraryCard
                      key={tool.id}
                      tool={tool}
                      cost={cost}
                      annotation={annotation}
                      isSelected={isSelected}
                      onAdd={() => addTool(tool)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* ── Column 2: Bundle Contents ────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <div className="px-5 pt-4 pb-3 shrink-0 border-b border-border">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Service Contents
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {selectedTools.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-border flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Service is empty
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Add tools from the left panel
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedTools.map((tool) => {
                    const pInput = toolToPricingInput(tool);
                    const cost = normalizeToMonthly(pInput, assumptions);
                    const annotation = annotateNormalization(pInput, assumptions);
                    return (
                      <SelectedToolRow
                        key={tool.id}
                        tool={tool}
                        cost={cost}
                        annotation={annotation}
                        onRemove={() => removeTool(tool.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {selectedTools.length > 0 && (
              <div className="shrink-0 border-t border-border px-5 py-3 bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {selectedTools.length} tool
                    {selectedTools.length !== 1 ? "s" : ""} ·{" "}
                    {totalCategories} categor
                    {totalCategories !== 1 ? "ies" : "y"}
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      Total MSP Cost
                    </span>
                    <p className="text-lg font-bold font-mono text-foreground leading-tight">
                      {formatCurrency(bundleCost.totalMonthlyCost)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Column 3: Scenarios + Sell Strategy + Results ───────────── */}
          <div className="w-[320px] shrink-0 border-l border-border flex flex-col overflow-hidden bg-white/[0.01]">
            <div className="flex-1 overflow-y-auto">

              {/* ── Scenarios ────────────────────────────────────────────── */}
              <div className="border-b border-border px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Scenarios
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowNewScenario((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Save current
                  </button>
                </div>

                {/* Saved scenario chips */}
                {scenarios.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scenarios.map((s) => (
                      <div
                        key={s.id}
                        className={`group flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] cursor-pointer transition-colors ${
                          activeScenarioId === s.id
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : "bg-white/[0.03] border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        }`}
                        onClick={() => loadScenario(s)}
                      >
                        <span className="truncate max-w-[140px]">{s.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeScenario(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all shrink-0"
                          aria-label="Delete scenario"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New scenario inline form */}
                {showNewScenario && (
                  <div className="flex gap-1.5 mt-1">
                    <Input
                      autoFocus
                      placeholder='e.g. "SMB 30 endpoints"'
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveAsScenario();
                        if (e.key === "Escape") setShowNewScenario(false);
                      }}
                      className="h-7 text-xs bg-white/[0.04] border-border flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={saveAsScenario}
                      disabled={!newScenarioName.trim() || isSavingScenario}
                      className="h-7 px-2 text-xs"
                    >
                      {isSavingScenario ? "…" : "Save"}
                    </Button>
                    <button
                      onClick={() => setShowNewScenario(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {scenarios.length === 0 && !showNewScenario && (
                  <p className="text-[11px] text-muted-foreground/50">
                    Save named scenarios (e.g. &ldquo;SMB 30 eps&rdquo;, &ldquo;Enterprise 500 eps&rdquo;) to quote multiple client profiles instantly
                  </p>
                )}
              </div>

              {/* ── Client Assumptions ────────────────────────────────────── */}
              <div className="border-b border-border">
                <button
                  onClick={() => setAssumptionsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Client Assumptions
                  </span>
                  {assumptionsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {assumptionsOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <AssumptionInput
                        label="Endpoints"
                        value={assumptions.endpoints}
                        onChange={(v) =>
                          setAssumptions((a) => ({ ...a, endpoints: v }))
                        }
                      />
                      <AssumptionInput
                        label="Users"
                        value={assumptions.users}
                        onChange={(v) =>
                          setAssumptions((a) => ({ ...a, users: v }))
                        }
                      />
                      <AssumptionInput
                        label="Headcount"
                        value={assumptions.headcount ?? assumptions.endpoints}
                        onChange={(v) =>
                          setAssumptions((a) => ({ ...a, headcount: v }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <AssumptionInput
                        label="Orgs"
                        value={assumptions.org_count}
                        onChange={(v) =>
                          setAssumptions((a) => ({ ...a, org_count: v }))
                        }
                      />
                      <AssumptionInput
                        label="Sites"
                        value={assumptions.sites ?? 1}
                        onChange={(v) =>
                          setAssumptions((a) => ({ ...a, sites: v }))
                        }
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/50">
                      Headcount drives tier lookup for tools priced by employee count
                    </p>
                  </div>
                )}
              </div>

              {/* ── Sell Strategy ─────────────────────────────────────────── */}
              <div className="px-4 pt-4 pb-3 border-b border-border space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Sell Strategy
                </h3>

                <Tabs
                  value={sellConfig.strategy}
                  onValueChange={(v) => changeStrategy(v as SellStrategy)}
                >
                  <TabsList className="grid grid-cols-2 h-auto p-1 bg-white/[0.04]">
                    <TabsTrigger
                      value="cost_plus_margin"
                      className="text-[10px] py-1.5 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Cost + Margin
                    </TabsTrigger>
                    <TabsTrigger
                      value="monthly_flat_rate"
                      className="text-[10px] py-1.5 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Monthly Flat
                    </TabsTrigger>
                    <TabsTrigger
                      value="per_endpoint_monthly"
                      className="text-[10px] py-1.5 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Per Endpoint
                    </TabsTrigger>
                    <TabsTrigger
                      value="per_user_monthly"
                      className="text-[10px] py-1.5 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      Per User
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-3">
                  {sellConfig.strategy === "cost_plus_margin" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">
                          Target Margin
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={5}
                            max={80}
                            step={1}
                            value={Math.round(
                              (sellConfig.target_margin_pct ?? 0.35) * 100
                            )}
                            onChange={(e) =>
                              setSellConfig((c) => ({
                                ...c,
                                target_margin_pct: Math.max(
                                  0.05,
                                  Math.min(0.8, (parseFloat(e.target.value) || 35) / 100)
                                ),
                              }))
                            }
                            className="w-12 text-right text-xs bg-white/[0.06] border border-border rounded px-1.5 py-1 text-foreground font-mono"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      <Slider
                        min={5}
                        max={80}
                        step={1}
                        value={[Math.round((sellConfig.target_margin_pct ?? 0.35) * 100)]}
                        onValueChange={([v]) =>
                          setSellConfig((c) => ({ ...c, target_margin_pct: v / 100 }))
                        }
                      />
                      {bundleCost.totalMonthlyCost > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Recommended sell:{" "}
                          <span className="text-foreground font-mono font-medium">
                            {formatCurrency(sellResult.sellPriceMonthly)}/mo
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {sellConfig.strategy === "monthly_flat_rate" && (
                    <PriceInput
                      label="Monthly Sell Price"
                      value={sellConfig.monthly_flat_price ?? 0}
                      onChange={(v) =>
                        setSellConfig((c) => ({ ...c, monthly_flat_price: v }))
                      }
                    />
                  )}

                  {sellConfig.strategy === "per_endpoint_monthly" && (
                    <>
                      <PriceInput
                        label="Sell Price per Endpoint"
                        value={sellConfig.per_endpoint_sell_price ?? 0}
                        onChange={(v) =>
                          setSellConfig((c) => ({ ...c, per_endpoint_sell_price: v }))
                        }
                      />
                      {(sellConfig.per_endpoint_sell_price ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Total @ {assumptions.endpoints} endpoints:{" "}
                          <span className="text-foreground font-mono font-medium">
                            {formatCurrency(sellResult.sellPriceMonthly)}/mo
                          </span>
                        </p>
                      )}
                    </>
                  )}

                  {sellConfig.strategy === "per_user_monthly" && (
                    <>
                      <PriceInput
                        label="Sell Price per User"
                        value={sellConfig.per_user_sell_price ?? 0}
                        onChange={(v) =>
                          setSellConfig((c) => ({ ...c, per_user_sell_price: v }))
                        }
                      />
                      {(sellConfig.per_user_sell_price ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Total @ {assumptions.users} users:{" "}
                          <span className="text-foreground font-mono font-medium">
                            {formatCurrency(sellResult.sellPriceMonthly)}/mo
                          </span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Live Results ──────────────────────────────────────────── */}
              <div className="px-4 py-4 space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Results
                </h3>

                {selectedTools.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 py-2">
                    Add tools to see pricing results
                  </p>
                ) : (
                  <>
                    <div
                      className={`rounded-lg border p-4 space-y-2.5 ${marginBg(sellResult.grossMarginPct)}`}
                    >
                      <ResultRow
                        label="MSP Cost"
                        value={formatCurrency(bundleCost.totalMonthlyCost) + "/mo"}
                        valueClass="font-mono text-muted-foreground"
                      />
                      <ResultRow
                        label="Sell Price"
                        value={
                          sellResult.sellPriceMonthly > 0
                            ? formatCurrency(sellResult.sellPriceMonthly) + "/mo"
                            : "—"
                        }
                        valueClass="font-mono text-foreground font-bold text-base"
                      />
                      <Separator className="opacity-20" />
                      <ResultRow
                        label="Gross Profit"
                        value={
                          sellResult.sellPriceMonthly > 0
                            ? formatCurrency(sellResult.grossProfit) + "/mo"
                            : "—"
                        }
                        valueClass={`font-mono ${marginColor(sellResult.grossMarginPct)}`}
                      />
                      <ResultRow
                        label="Gross Margin"
                        value={
                          sellResult.sellPriceMonthly > 0
                            ? formatPercent(sellResult.grossMarginPct)
                            : "—"
                        }
                        valueClass={`font-mono font-semibold ${marginColor(sellResult.grossMarginPct)}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      {sellResult.sellPriceMonthly === 0 && (
                        <FlagBanner
                          severity="info"
                          message="Enter a sell price to see profit and margin"
                        />
                      )}
                      {sellResult.sellPriceMonthly > 0 &&
                        sellResult.grossMarginPct < 0 && (
                          <FlagBanner
                            severity="error"
                            message="Sell price is below cost — negative margin"
                          />
                        )}
                      {sellResult.sellPriceMonthly > 0 &&
                        sellResult.grossMarginPct >= 0 &&
                        sellResult.grossMarginPct < 0.15 && (
                          <FlagBanner
                            severity="warning"
                            message="Margin below 15% — consider raising your price"
                          />
                        )}
                    </div>

                    {/* Per-tool breakdown with formula explanations */}
                    {bundleCost.perToolBreakdown.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                          Cost breakdown
                        </p>
                        {bundleCost.perToolBreakdown.map((item) => (
                          <div key={item.toolId} className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {item.toolName}
                              </span>
                              <span className="text-xs font-mono text-foreground/70 shrink-0">
                                {formatCurrency(item.monthlyCost)}/mo
                              </span>
                            </div>
                            {item.annotation && (
                              <p className="text-[10px] text-muted-foreground/40 pl-2">
                                {item.annotation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="shrink-0 px-4 py-3 border-t border-border bg-white/[0.02]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      className="w-full gap-1.5"
                      onClick={handleSave}
                      disabled={!canSave || isPending}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      {isPending ? "Saving…" : "Save Pricing Version"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canSave && (
                  <TooltipContent side="top" className="text-xs max-w-[200px]">
                    {name.trim().length === 0
                      ? "Enter a version name"
                      : selectedTools.length === 0
                        ? "Add at least one tool"
                        : "Set a sell price to save"}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolLibraryCard({
  tool,
  cost,
  annotation,
  isSelected,
  onAdd,
}: {
  tool: Tool;
  cost: number;
  annotation: string | null;
  isSelected: boolean;
  onAdd: () => void;
}) {
  const modelLabel = PRICING_MODEL_LABELS[tool.pricing_model] ?? tool.pricing_model;
  const initial = (tool.vendor?.[0] ?? tool.name[0]).toUpperCase();

  return (
    <div
      className={`rounded-md border p-2.5 transition-all ${
        isSelected
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-white/[0.02] hover:border-border/80 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-white/[0.08] border border-border shrink-0 flex items-center justify-center text-[10px] font-bold text-muted-foreground mt-0.5">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground leading-tight truncate">
              {tool.name}
            </p>
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {tool.vendor}
            </p>
          </div>
        </div>
        <button
          onClick={onAdd}
          disabled={isSelected}
          className={`shrink-0 flex items-center justify-center w-6 h-6 rounded transition-colors ${
            isSelected
              ? "text-emerald-400 cursor-default"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06] border border-border"
          }`}
        >
          {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <Badge
          variant="outline"
          className="text-[9px] px-1.5 py-0 h-4 font-normal border-border/50 text-muted-foreground/70"
        >
          {modelLabel}
        </Badge>
        <div className="text-right">
          <span className="text-xs font-mono text-foreground/80">
            {formatCurrency(cost)}/mo
          </span>
          {annotation && (
            <p className="text-[9px] text-muted-foreground/50 leading-tight">
              {annotation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedToolRow({
  tool,
  cost,
  annotation,
  onRemove,
}: {
  tool: Tool;
  cost: number;
  annotation: string | null;
  onRemove: () => void;
}) {
  const initial = (tool.vendor?.[0] ?? tool.name[0]).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-white/[0.02] px-3 py-2.5 group hover:bg-white/[0.04] transition-colors">
      <div className="w-7 h-7 rounded bg-white/[0.06] border border-border shrink-0 flex items-center justify-center text-[11px] font-bold text-muted-foreground">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{tool.name}</p>
        <p className="text-xs text-muted-foreground/60 truncate">
          {tool.vendor} ·{" "}
          <span className="font-mono">{formatCurrency(cost)}/mo</span>
          {annotation && (
            <span className="text-muted-foreground/40"> · {annotation}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 hidden sm:flex border-border/40 text-muted-foreground/50"
        >
          {CATEGORY_LABELS[tool.category]}
        </Badge>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-red-400 transition-all w-5 h-5 flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AssumptionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground/70 block">{label}</label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="h-7 text-xs font-mono text-center bg-white/[0.04] border-border px-1"
      />
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input
          type="number"
          min={0}
          step={1}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="pl-6 h-8 text-sm font-mono bg-white/[0.03]"
          placeholder="0.00"
        />
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm ${valueClass ?? ""}`}>{value}</span>
    </div>
  );
}

function FlagBanner({
  severity,
  message,
}: {
  severity: "error" | "warning" | "info";
  message: string;
}) {
  const config = {
    error: {
      cls: "bg-red-500/8 border-red-500/20 text-red-400",
      icon: <AlertCircle className="h-3 w-3 shrink-0" />,
    },
    warning: {
      cls: "bg-amber-500/8 border-amber-500/20 text-amber-400",
      icon: <AlertTriangle className="h-3 w-3 shrink-0" />,
    },
    info: {
      cls: "bg-blue-500/8 border-blue-500/20 text-blue-400",
      icon: <AlertCircle className="h-3 w-3 shrink-0" />,
    },
  }[severity];

  return (
    <div className={`flex items-center gap-2 rounded border px-2.5 py-2 text-xs ${config.cls}`}>
      {config.icon}
      {message}
    </div>
  );
}
