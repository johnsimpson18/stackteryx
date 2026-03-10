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
import { VENDOR_LIST } from "@/lib/data/tool-library";
import { addVendorsFromLibraryAction } from "@/actions/vendors";

// ── Props ────────────────────────────────────────────────────────────────────

interface VendorLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingVendorNames: Set<string>;
}

// ── Component ────────────────────────────────────────────────────────────────

export function VendorLibraryModal({
  open,
  onOpenChange,
  existingVendorNames,
}: VendorLibraryModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return VENDOR_LIST;
    const q = search.toLowerCase();
    return VENDOR_LIST.filter((v) => v.name.toLowerCase().includes(q));
  }, [search]);

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleAdd() {
    const names = Array.from(selected);
    startTransition(async () => {
      const result = await addVendorsFromLibraryAction(names);
      if (result.success) {
        toast.success(
          `${result.data.count} vendor${result.data.count !== 1 ? "s" : ""} added`
        );
        setSelected(new Set());
        setSearch("");
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  // Initials avatar
  function initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Vendors from Library</DialogTitle>
          <DialogDescription>
            Select vendors to add to your account. You can configure costs and
            discounts later.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
          {filtered.map((vendor) => {
            const alreadyAdded = existingVendorNames.has(
              vendor.name.toLowerCase()
            );
            const isSelected = selected.has(vendor.name);

            return (
              <button
                key={vendor.name}
                type="button"
                disabled={alreadyAdded}
                onClick={() => toggle(vendor.name)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                  alreadyAdded
                    ? "border-border/40 bg-card/30 opacity-50 cursor-not-allowed"
                    : isSelected
                      ? "border-primary bg-primary/5 cursor-pointer"
                      : "border-border bg-card/60 hover:border-primary/40 cursor-pointer"
                )}
              >
                {/* Initials avatar */}
                <div className="h-9 w-9 rounded-lg bg-white/5 border border-border/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {initials(vendor.name)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {vendor.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {vendor.toolCount} tool
                    {vendor.toolCount !== 1 ? "s" : ""} in library
                  </p>
                </div>

                {/* Status */}
                {alreadyAdded ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] flex-shrink-0"
                  >
                    Added
                  </Badge>
                ) : isSelected ? (
                  <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check
                      className="h-3 w-3 text-primary-foreground"
                      strokeWidth={3}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No vendors match your search.
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              {selected.size} vendor{selected.size !== 1 ? "s" : ""} selected
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
                "Add Selected"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
