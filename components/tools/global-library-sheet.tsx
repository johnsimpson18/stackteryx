"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Check, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { addGlobalToolToOrg } from "@/actions/global-tool-library";
import type { GlobalToolEntry } from "@/actions/global-tool-library";

// ── Category labels for the global library ──────────────────────────────────

const GLOBAL_CATEGORY_LABELS: Record<string, string> = {
  edr: "EDR",
  mdr: "MDR",
  siem: "SIEM",
  idp: "Identity",
  backup: "Backup",
  network: "Network",
  "email-security": "Email Security",
  vulnerability: "Vulnerability Mgmt",
  "dns-filtering": "DNS Filtering",
  patch: "Patch Mgmt",
  "dark-web": "Dark Web",
  compliance: "Compliance",
  psa: "PSA",
  rmm: "RMM",
};

const COMPLIANCE_BADGE_COLORS: Record<string, string> = {
  HIPAA: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "PCI DSS": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CMMC: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SOC2: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  NIST: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface GlobalLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  globalTools: GlobalToolEntry[];
  existingToolNames: Set<string>;
}

// ── Main Component ──────────────────────────────────────────────────────────

export function GlobalLibrarySheet({
  open,
  onOpenChange,
  globalTools,
  existingToolNames,
}: GlobalLibrarySheetProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [complianceFilter, setComplianceFilter] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Build list of unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of globalTools) cats.add(t.category);
    return Array.from(cats).sort();
  }, [globalTools]);

  // Build list of unique compliance tags
  const complianceTags = useMemo(() => {
    const tags = new Set<string>();
    for (const t of globalTools) {
      for (const tag of t.compliance_tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  }, [globalTools]);

  // Filter tools
  const filtered = useMemo(() => {
    let list = globalTools;
    if (categoryFilter) {
      list = list.filter((t) => t.category === categoryFilter);
    }
    if (complianceFilter) {
      list = list.filter((t) => t.compliance_tags.includes(complianceFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.vendor.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [globalTools, categoryFilter, complianceFilter, search]);

  function isAlreadyInCatalog(tool: GlobalToolEntry) {
    return existingToolNames.has(tool.name.toLowerCase()) || addedIds.has(tool.id);
  }

  function handleAdd(tool: GlobalToolEntry) {
    setAddingIds((prev) => new Set(prev).add(tool.id));
    startTransition(async () => {
      const result = await addGlobalToolToOrg(tool.id);
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(tool.id);
        return next;
      });
      if (result.success) {
        setAddedIds((prev) => new Set(prev).add(tool.id));
        toast.success(`${tool.name} added to your catalog`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl w-full flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Global Tool Library
          </SheetTitle>
          <SheetDescription>
            Browse 60+ pre-loaded tools. Add to your catalog with one click.
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools, vendors, or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category filter pills */}
        <div className="px-4 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                categoryFilter === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {GLOBAL_CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Compliance filter pills */}
        <div className="px-4 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {complianceTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setComplianceFilter(complianceFilter === tag ? null : tag)}
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors ${
                  complianceFilter === tag
                    ? COMPLIANCE_BADGE_COLORS[tag] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    : "bg-transparent text-muted-foreground/70 border-border hover:border-primary/40"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Tool cards grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="text-xs text-muted-foreground mb-3">
            {filtered.length} tool{filtered.length !== 1 ? "s" : ""}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No tools match your filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((tool) => {
                const inCatalog = isAlreadyInCatalog(tool);
                const isAdding = addingIds.has(tool.id);

                return (
                  <div
                    key={tool.id}
                    className="rounded-lg border border-border/60 bg-card/50 p-3 flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {tool.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tool.vendor}
                          {tool.subcategory && ` · ${tool.subcategory}`}
                        </p>
                      </div>
                      <span className="text-[10px] rounded-full border border-border px-1.5 py-0.5 text-muted-foreground/70 flex-shrink-0">
                        {GLOBAL_CATEGORY_LABELS[tool.category] ?? tool.category}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-2">
                      {tool.description}
                    </p>

                    {/* Cost range */}
                    <div className="text-xs text-muted-foreground mb-2">
                      {tool.typical_cost_low != null && tool.typical_cost_high != null ? (
                        <span>
                          ${tool.typical_cost_low}–${tool.typical_cost_high}/{tool.cost_unit}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">Cost varies</span>
                      )}
                    </div>

                    {/* Compliance badges */}
                    {tool.compliance_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tool.compliance_tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${
                              COMPLIANCE_BADGE_COLORS[tag] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add button */}
                    <div className="mt-auto">
                      {inCatalog ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled
                          className="w-full h-7 text-xs text-muted-foreground"
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          In Catalog
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs"
                          disabled={isAdding}
                          onClick={() => handleAdd(tool)}
                        >
                          {isAdding ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Add to My Tools
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
