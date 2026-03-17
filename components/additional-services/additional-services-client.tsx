"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { InlinePriceEditor } from "@/components/ui/inline-price-editor";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";
import Link from "next/link";
import {
  Plus,
  Search,
  Archive,
  Briefcase,
  GraduationCap,
  Shield,
  Headphones,
  FolderKanban,
  Users,
} from "lucide-react";
import {
  createAdditionalServiceAction,
  updateAdditionalServiceAction,
  archiveAdditionalServiceAction,
  updateAdditionalServicePriceAction,
} from "@/actions/additional-services";
import type {
  AdditionalService,
  AdditionalServiceCategory,
  AdditionalServiceBillingType,
  AdditionalServiceCostType,
} from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<AdditionalServiceCategory, string> = {
  consulting: "Consulting",
  help_desk: "Help Desk",
  retainer: "Retainer",
  training: "Training",
  project: "Project",
  compliance: "Compliance",
};

const CATEGORY_ICONS: Record<AdditionalServiceCategory, typeof Briefcase> = {
  consulting: Briefcase,
  help_desk: Headphones,
  retainer: Shield,
  training: GraduationCap,
  project: FolderKanban,
  compliance: Shield,
};

const CATEGORY_COLORS: Record<AdditionalServiceCategory, string> = {
  consulting: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  help_desk: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  retainer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  training: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  project: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  compliance: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const BILLING_TYPE_LABELS: Record<AdditionalServiceBillingType, string> = {
  monthly: "Monthly",
  per_user: "Per User",
  per_device: "Per Device",
  per_site: "Per Site",
  hourly: "Hourly",
  one_time: "One-Time",
};

const COST_TYPE_LABELS: Record<AdditionalServiceCostType, string> = {
  internal_labor: "Internal Labor",
  subcontractor: "Subcontractor",
  zero_cost: "Zero Cost",
};

const FILTER_CATEGORIES: Array<AdditionalServiceCategory | "all"> = [
  "all", "consulting", "help_desk", "retainer", "compliance", "project", "training",
];

// ── Template cards for empty state ────────────────────────────────────────────

interface ServiceTemplate {
  name: string;
  category: AdditionalServiceCategory;
  billing_type: AdditionalServiceBillingType;
  cost: number;
  sell_price: number;
}

const TEMPLATES: ServiceTemplate[] = [
  { name: "Fractional vCISO", category: "consulting", billing_type: "monthly", cost: 0, sell_price: 1500 },
  { name: "Fractional CTO", category: "consulting", billing_type: "monthly", cost: 0, sell_price: 2000 },
  { name: "Compliance Advisory", category: "compliance", billing_type: "monthly", cost: 0, sell_price: 800 },
  { name: "IR Retainer", category: "retainer", billing_type: "monthly", cost: 0, sell_price: 500 },
  { name: "Help Desk", category: "help_desk", billing_type: "per_user", cost: 8, sell_price: 22 },
  { name: "Security Training", category: "training", billing_type: "per_user", cost: 2, sell_price: 6 },
  { name: "Project Work", category: "project", billing_type: "one_time", cost: 150, sell_price: 250 },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AdditionalServicesClientProps {
  services: AdditionalService[];
  usageMap?: Record<string, { bundle_id: string; bundle_name: string }[]>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdditionalServicesClient({ services, usageMap = {} }: AdditionalServicesClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AdditionalServiceCategory | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingService, setEditingService] = useState<AdditionalService | null>(null);
  const [templateDefaults, setTemplateDefaults] = useState<ServiceTemplate | null>(null);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (s.status === "archived") return false;
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [services, search, categoryFilter]);

  function openCreate(template?: ServiceTemplate) {
    setEditingService(null);
    setTemplateDefaults(template ?? null);
    setSheetOpen(true);
  }

  function openEdit(svc: AdditionalService) {
    setEditingService(svc);
    setTemplateDefaults(null);
    setSheetOpen(true);
  }

  function handleSheetClose() {
    setSheetOpen(false);
    setEditingService(null);
    setTemplateDefaults(null);
  }

  const activeServices = services.filter((s) => s.status !== "archived");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Add-On Services</h2>
          <p className="text-sm text-muted-foreground">
            Consulting, retainers, and professional services that power your margin
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {activeServices.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No add-on services yet"
            description="Add consulting, retainers, and professional services to complete your business model."
          />
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Start from a template
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {TEMPLATES.map((tmpl) => {
                const Icon = CATEGORY_ICONS[tmpl.category];
                const margin = tmpl.sell_price > 0
                  ? (tmpl.sell_price - tmpl.cost) / tmpl.sell_price
                  : 0;
                return (
                  <button
                    key={tmpl.name}
                    onClick={() => openCreate(tmpl)}
                    className="rounded-lg border border-border p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{tmpl.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABELS[tmpl.category]}
                      </Badge>
                      <span>{BILLING_TYPE_LABELS[tmpl.billing_type]}</span>
                      <span className="ml-auto font-mono">{formatCurrency(tmpl.sell_price)}</span>
                      <MarginHealthBadge margin={margin} showLabel={false} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <>
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
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              {FILTER_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <EmptyState title="No matching services" description="Try adjusting your search or filters." />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sell Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Used In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((svc) => (
                    <ServiceRow
                      key={svc.id}
                      service={svc}
                      usages={usageMap[svc.id] ?? []}
                      onEdit={() => openEdit(svc)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer CTA */}
          <p className="text-sm text-muted-foreground">
            Add these to your services in the service wizard.{" "}
            <Link href="/services/new" className="underline">
              Build a Service →
            </Link>
          </p>
        </>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingService ? "Edit Service" : "Add Service"}</SheetTitle>
            <SheetDescription>
              {editingService
                ? "Update this additional service."
                : "Create a new consulting, retainer, or professional service."}
            </SheetDescription>
          </SheetHeader>
          <ServiceForm
            existing={editingService}
            template={templateDefaults}
            onSuccess={handleSheetClose}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Service Row ───────────────────────────────────────────────────────────────

function ServiceRow({
  service: svc,
  usages,
  onEdit,
}: {
  service: AdditionalService;
  usages: { bundle_id: string; bundle_name: string }[];
  onEdit: () => void;
}) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const margin = Number(svc.margin_pct) / 100;

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAdditionalServiceAction(svc.id);
      if (result.success) {
        toast.success(`"${svc.name}" archived`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <TableRow className="border-border/30">
      <TableCell>
        <span className="font-medium text-foreground/90">{svc.name}</span>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn("text-[10px]", CATEGORY_COLORS[svc.category])}>
          {CATEGORY_LABELS[svc.category]}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {BILLING_TYPE_LABELS[svc.billing_type]}
      </TableCell>
      <TableCell>
        <InlinePriceEditor
          value={Number(svc.cost)}
          unit=""
          fieldLabel={`${svc.name} cost`}
          onSave={async (v) => updateAdditionalServicePriceAction(svc.id, "cost", v)}
        />
      </TableCell>
      <TableCell>
        <InlinePriceEditor
          value={Number(svc.sell_price)}
          unit=""
          fieldLabel={`${svc.name} sell price`}
          onSave={async (v) => updateAdditionalServicePriceAction(svc.id, "sell_price", v)}
        />
      </TableCell>
      <TableCell>
        <MarginHealthBadge margin={margin} />
      </TableCell>
      <TableCell>
        {usages.length > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                {usages.length} service{usages.length !== 1 ? "s" : ""}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <ul className="space-y-1">
                {usages.map((u) => (
                  <li key={u.bundle_id}>
                    <Link
                      href={`/services/${u.bundle_id}`}
                      className="block rounded px-2 py-1 text-sm hover:bg-muted transition-colors"
                    >
                      {u.bundle_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-muted-foreground text-sm">Not used</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={svc.status === "active" ? "secondary" : "outline"} className="text-[10px] capitalize">
          {svc.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
            <Users className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleArchive}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Service Form (Sheet) ──────────────────────────────────────────────────────

function ServiceForm({
  existing,
  template,
  onSuccess,
}: {
  existing: AdditionalService | null;
  template: ServiceTemplate | null;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(existing?.name ?? template?.name ?? "");
  const [category, setCategory] = useState<AdditionalServiceCategory>(
    existing?.category ?? template?.category ?? "consulting"
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [billingType, setBillingType] = useState<AdditionalServiceBillingType>(
    existing?.billing_type ?? template?.billing_type ?? "monthly"
  );
  const [costType, setCostType] = useState<AdditionalServiceCostType>(
    existing?.cost_type ?? (template && template.cost === 0 ? "zero_cost" : "internal_labor")
  );
  const [cost, setCost] = useState(String(existing?.cost ?? template?.cost ?? 0));
  const [sellPrice, setSellPrice] = useState(
    String(existing?.sell_price ?? template?.sell_price ?? 0)
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const costNum = parseFloat(cost) || 0;
  const sellNum = parseFloat(sellPrice) || 0;
  const liveMargin = sellNum > 0
    ? (sellNum - (costType === "zero_cost" ? 0 : costNum)) / sellNum
    : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = {
      name: name.trim(),
      category,
      description: description.trim() || null,
      billing_type: billingType,
      cost_type: costType,
      cost: costType === "zero_cost" ? 0 : costNum,
      sell_price: sellNum,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      const result = existing
        ? await updateAdditionalServiceAction(existing.id, formData)
        : await createAdditionalServiceAction(formData);

      if (result.success) {
        toast.success(existing ? "Service updated" : "Service created");
        router.refresh();
        onSuccess();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as AdditionalServiceCategory)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_LABELS) as AdditionalServiceCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional description"
        />
      </div>

      <div className="space-y-2">
        <Label>Billing Type</Label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BILLING_TYPE_LABELS) as AdditionalServiceBillingType[]).map((bt) => (
            <Button
              key={bt}
              type="button"
              variant={billingType === bt ? "secondary" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setBillingType(bt)}
            >
              {BILLING_TYPE_LABELS[bt]}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cost Type</Label>
        <div className="flex gap-3">
          {(Object.keys(COST_TYPE_LABELS) as AdditionalServiceCostType[]).map((ct) => (
            <label key={ct} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="cost_type"
                value={ct}
                checked={costType === ct}
                onChange={() => setCostType(ct)}
                className="accent-primary"
              />
              {COST_TYPE_LABELS[ct]}
            </label>
          ))}
        </div>
      </div>

      {costType !== "zero_cost" && (
        <div className="space-y-2">
          <Label>Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Sell Price ($) *</Label>
        <Input
          type="number"
          step="0.01"
          min={0}
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          required
        />
      </div>

      {/* Live margin preview */}
      <div className="rounded-lg border border-border p-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Estimated Margin</span>
          <MarginHealthBadge margin={liveMargin} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Internal Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Internal notes (not visible to clients)"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? "Saving..." : existing ? "Update Service" : "Create Service"}
        </Button>
        <Button type="button" variant="outline" onClick={onSuccess} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
