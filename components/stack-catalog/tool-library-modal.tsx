"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TOOL_LIBRARY,
  LIBRARY_DOMAINS,
} from "@/lib/data/tool-library";
import type { LibraryDomain, BillingUnit } from "@/lib/data/tool-library";
import { addToolsFromLibraryAction } from "@/actions/tools";

// ── Props ────────────────────────────────────────────────────────────────────

interface ToolLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingToolNames: Set<string>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function billingLabel(unit: BillingUnit) {
  switch (unit) {
    case "per-user":
      return "/user/mo";
    case "per-device":
      return "/device/mo";
    case "flat":
      return "/mo flat";
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ToolLibraryModal({
  open,
  onOpenChange,
  existingToolNames,
}: ToolLibraryModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return TOOL_LIBRARY;
    const q = search.toLowerCase();
    return TOOL_LIBRARY.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.domain.toLowerCase().includes(q)
    );
  }, [search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await addToolsFromLibraryAction(ids);
      if (result.success) {
        toast.success(`${result.data.count} tool${result.data.count !== 1 ? "s" : ""} added to your stack`);
        setSelected(new Set());
        setSearch("");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  // Group filtered tools by domain
  const grouped = useMemo(() => {
    const map = new Map<LibraryDomain, typeof filtered>();
    for (const domain of LIBRARY_DOMAINS) {
      const domainTools = filtered.filter((t) => t.domain === domain);
      if (domainTools.length > 0) map.set(domain, domainTools);
    }
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Library</DialogTitle>
          <DialogDescription>
            Select tools from our curated library to add to your stack catalog.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tools, vendors, or domains..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {Array.from(grouped.entries()).map(([domain, domainTools]) => (
            <div key={domain}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-background py-1 z-10">
                {domain}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {domainTools.map((tool) => {
                  const alreadyAdded = existingToolNames.has(
                    tool.name.toLowerCase()
                  );
                  const isSelected = selected.has(tool.id);

                  return (
                    <button
                      key={tool.id}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => toggle(tool.id)}
                      className={cn(
                        "relative text-left rounded-lg border p-3 transition-all",
                        alreadyAdded
                          ? "border-border/40 bg-card/30 opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "border-primary bg-primary/5 cursor-pointer"
                            : "border-border bg-card/60 hover:border-primary/40 cursor-pointer"
                      )}
                    >
                      {isSelected && !alreadyAdded && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check
                            className="h-2.5 w-2.5 text-primary-foreground"
                            strokeWidth={3}
                          />
                        </span>
                      )}
                      <div className="pr-6">
                        <p className="text-sm font-medium text-foreground">
                          {tool.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tool.vendor}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {tool.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {tool.domain}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          ~${tool.typical_cost_per_user}
                          {billingLabel(tool.billing_unit)}
                        </span>
                        {alreadyAdded && (
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Already added
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {grouped.size === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tools match your search.
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              {selected.size} tool{selected.size !== 1 ? "s" : ""} selected
            </p>
            <Button
              onClick={handleAdd}
              disabled={selected.size === 0 || isPending}
              size="sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Adding...
                </>
              ) : (
                `Add Selected Tools`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
