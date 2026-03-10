"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Layers } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { OrgVendorWithMeta, ToolCategory } from "@/lib/types";

interface VendorListProps {
  vendors: OrgVendorWithMeta[];
}

export function VendorList({ vendors }: VendorListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.display_name.toLowerCase().includes(q) ||
        v.global_vendor_name?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q)
    );
  }, [vendors, search]);

  if (vendors.length === 0) {
    return (
      <EmptyState
        title="No vendors yet"
        description="Vendors are the tools and services you resell. Add them to model your costs accurately."
        actionLabel="Add your first vendor"
        actionHref="/vendors/new"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No matching vendors"
          description="Try adjusting your search."
          actionLabel="Clear search"
          onAction={() => setSearch("")}
        />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Vendor Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Global Vendor</TableHead>
                <TableHead className="text-center">Cost Models</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((vendor) => (
                <TableRow key={vendor.id} className="cursor-pointer hover:bg-muted/20">
                  <TableCell>
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {vendor.display_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {vendor.category ? (
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[vendor.category as ToolCategory] ??
                          vendor.category}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vendor.global_vendor_name ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{vendor.global_vendor_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{vendor.cost_model_count}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(vendor.created_at).toLocaleDateString()}
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
