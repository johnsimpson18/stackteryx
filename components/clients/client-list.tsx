"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatPercent } from "@/lib/formatting";
import { CLIENT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Search, AlertTriangle, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ClientWithContracts, ClientStatus } from "@/lib/types";

interface HealthScoreSummary {
  overallScore: number;
  color: "green" | "amber" | "red";
  scoreDelta: number | null;
}

interface ClientListProps {
  clients: ClientWithContracts[];
  userRole: string;
  complianceScores?: Record<string, number>;
  healthScores?: Record<string, HealthScoreSummary>;
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function marginColor(margin: number): string {
  if (margin >= 0.25) return "text-emerald-600";
  if (margin >= 0.15) return "text-amber-600";
  return "text-red-600";
}

type SortField = "name" | "margin" | "mrr";
type SortDir = "asc" | "desc";

function healthColor(color: "green" | "amber" | "red"): string {
  if (color === "green") return "text-emerald-400";
  if (color === "amber") return "text-amber-400";
  return "text-red-400";
}

function healthDot(color: "green" | "amber" | "red"): string {
  if (color === "green") return "bg-emerald-400";
  if (color === "amber") return "bg-amber-400";
  return "bg-red-400";
}

export function ClientList({ clients, userRole, complianceScores = {}, healthScores = {} }: ClientListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const canEdit = ["owner", "finance", "sales"].includes(userRole);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  }

  const filtered = clients
    .filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.industry.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const ac = a.active_contract;
      const bc = b.active_contract;

      let cmp = 0;
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === "mrr") {
        const aMrr = ac?.monthly_revenue ?? -Infinity;
        const bMrr = bc?.monthly_revenue ?? -Infinity;
        cmp = aMrr - bMrr;
      } else {
        const aMargin = ac?.margin_pct ?? -Infinity;
        const bMargin = bc?.margin_pct ?? -Infinity;
        cmp = aMargin - bMargin;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients added yet."
        description="Add your first client to start assigning services and generating proposals."
        actionLabel={canEdit ? "Add Client" : undefined}
        actionHref={canEdit ? "/clients/new" : undefined}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ClientStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching clients"
          description="Try adjusting your search or filters."
          actionLabel="Clear filters"
          onAction={() => { setSearch(""); setStatusFilter("all"); }}
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active Service</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("mrr")}
                  >
                    MRR
                    {sortField === "mrr" && (
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => toggleSort("margin")}
                  >
                    Margin
                    {sortField === "margin" && (
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead className="text-center">Health</TableHead>
                <TableHead className="text-center">Compliance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((client) => {
                const contract = client.active_contract;
                const days = contract ? daysUntil(contract.end_date) : null;
                const renewalSoon = days !== null && days <= 60 && days > 0;
                const expired = days !== null && days <= 0;

                return (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {client.name}
                      </Link>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {client.industry}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={client.status} label={CLIENT_STATUS_LABELS[client.status]} />
                    </TableCell>
                    <TableCell>
                      {contract ? (
                        <Link
                          href={`/services/${contract.bundle_id}/versions/${contract.bundle_version_id}`}
                          className="text-sm hover:text-primary transition-colors"
                        >
                          {contract.bundle_name}
                          <span className="text-muted-foreground ml-1">
                            v{contract.version_number}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {contract ? contract.seat_count : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {contract ? formatCurrency(contract.monthly_revenue) : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono text-sm",
                        contract ? marginColor(contract.margin_pct) : "text-muted-foreground"
                      )}
                    >
                      {contract ? formatPercent(contract.margin_pct) : "—"}
                    </TableCell>
                    <TableCell>
                      {contract && days !== null ? (
                        <div className="flex items-center gap-1">
                          {(renewalSoon || expired) && (
                            <AlertTriangle
                              className={cn(
                                "h-3.5 w-3.5",
                                expired ? "text-red-500" : "text-amber-500"
                              )}
                            />
                          )}
                          <span
                            suppressHydrationWarning
                            className={cn(
                              "text-xs",
                              expired
                                ? "text-red-600 font-medium"
                                : renewalSoon
                                  ? "text-amber-600 font-medium"
                                  : "text-muted-foreground"
                            )}
                          >
                            {expired
                              ? `Expired ${Math.abs(days)}d ago`
                              : days === 0
                                ? "Expires today"
                                : `${days}d`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {healthScores[client.id] ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={cn("h-1.5 w-1.5 rounded-full", healthDot(healthScores[client.id].color))} />
                          <span className={cn("text-xs font-mono font-semibold", healthColor(healthScores[client.id].color))}>
                            {healthScores[client.id].overallScore}
                          </span>
                          {healthScores[client.id].scoreDelta !== null && healthScores[client.id].scoreDelta !== 0 && (
                            <span className={cn("text-[10px] font-mono", (healthScores[client.id].scoreDelta ?? 0) > 0 ? "text-emerald-500" : "text-red-500")}>
                              {(healthScores[client.id].scoreDelta ?? 0) > 0 ? "+" : ""}{healthScores[client.id].scoreDelta}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {complianceScores[client.id] != null ? (
                        <span
                          className={cn(
                            "text-xs font-mono font-medium",
                            complianceScores[client.id] >= 80
                              ? "text-emerald-400"
                              : complianceScores[client.id] >= 50
                                ? "text-amber-400"
                                : "text-red-400"
                          )}
                        >
                          {complianceScores[client.id]}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
