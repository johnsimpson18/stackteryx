"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { MarginHealthBadge } from "@/components/ui/margin-health-badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting";
import { INDUSTRY_OPTIONS } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Layers2,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import {
  createProposalAction,
  updateProposalContentAction,
  exportProposalPdfAction,
  exportProposalDocxAction,
} from "@/actions/proposals";
import {
  getServiceContextPreview,
  type ServiceContextPreview,
} from "@/actions/sales-studio";
import { SalesEnablementPanel } from "./sales-enablement-panel";
import { FractionalCTOStudioPanel } from "./fractional-cto-studio-panel";
import { ContextQualityBadge } from "@/components/ui/context-quality-badge";
import { AgentBadge } from "@/components/agents/agent-badge";
import { AgentWorking } from "@/components/agents/agent-working";
import { usePlanContext } from "@/components/providers/plan-provider";
import type {
  ClientWithContracts,
  Proposal,
  ProposalContent,
  ProposalServiceRef,
  BundleType,
} from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface ActiveBundle {
  id: string;
  name: string;
  bundle_type: BundleType;
}

interface BundleVersionInfo {
  id: string;
  suggested_price: number | null;
  seat_count: number;
  cost_per_seat: number | null;
}

interface SalesStudioClientProps {
  clients: ClientWithContracts[];
  activeBundles: ActiveBundle[];
  bundleVersions: Record<string, BundleVersionInfo>;
  proposals: Proposal[];
  initialTab: StudioTab;
  preSelectedClientId: string | null;
  preSelectedClientContracts: {
    bundle_id: string;
    bundle_version_id: string;
    bundle_name: string;
  }[];
  orgName: string;
  orgTargetVerticals: string[];
  playbookStatus: Record<string, boolean>;
  bundleOutcomes?: Record<string, boolean>;
  publishedPackages?: { id: string; name: string; item_count: number }[];
}

interface ServiceSelection {
  bundle_id: string;
  pricing_version_id: string;
  service_name: string;
  checked: boolean;
  suggested_price: number | null;
  override_price: number | null;
  cost_per_seat: number | null;
}

type StudioTab = "client" | "prospect" | "playbooks" | "history" | "fractional-cto";

// ── Helper ───────────────────────────────────────────────────────────────────

function downloadBase64(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SalesStudioClient({
  clients,
  activeBundles,
  bundleVersions,
  proposals,
  initialTab,
  preSelectedClientId,
  preSelectedClientContracts,
  orgName,
  orgTargetVerticals,
  playbookStatus,
  bundleOutcomes = {},
  publishedPackages = [],
}: SalesStudioClientProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Tab state (synced with URL ?tab=) ──────────────────────────────────
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  function handleTabChange(value: string) {
    const tab = value as StudioTab;
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Derive mode from active tab for backwards compatibility
  const mode: "client" | "prospect" | "enablement" =
    activeTab === "prospect" ? "prospect" :
    activeTab === "playbooks" ? "enablement" : "client";

  // ── Client mode state ──────────────────────────────────────────────────
  const [clientId, setClientId] = useState(preSelectedClientId ?? "");
  const [clientSearch, setClientSearch] = useState("");
  const [clientServices, setClientServices] = useState<ServiceSelection[]>(
    () =>
      preSelectedClientContracts.map((c) => ({
        bundle_id: c.bundle_id,
        pricing_version_id: c.bundle_version_id,
        service_name: c.bundle_name,
        checked: true,
        suggested_price:
          bundleVersions[c.bundle_id]?.suggested_price ?? null,
        override_price: null,
        cost_per_seat: bundleVersions[c.bundle_id]?.cost_per_seat ?? null,
      }))
  );

  // ── Prospect mode state ────────────────────────────────────────────────
  const [prospectName, setProspectName] = useState("");
  const [prospectIndustry, setProspectIndustry] = useState("");
  const [prospectSize, setProspectSize] = useState("");
  const [primaryConcern, setPrimaryConcern] = useState("");
  const [matchedServices, setMatchedServices] = useState<ServiceSelection[]>(
    []
  );
  const [matchLoading, setMatchLoading] = useState(false);

  // ── Proposal state ─────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [proposal, setProposal] = useState<ProposalContent | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [editedSections, setEditedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved"
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Regeneration state (per-section) ───────────────────────────────────
  const [regenSection, setRegenSection] = useState<string | null>(null);

  // ── Export state ───────────────────────────────────────────────────────
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  // ── Service context preview state ──────────────────────────────────────
  const [contextPreviews, setContextPreviews] = useState<
    Record<string, ServiceContextPreview>
  >({});
  const [contextLoading, setContextLoading] = useState<Set<string>>(new Set());

  const fetchContextPreview = useCallback(async (bundleId: string) => {
    if (contextPreviews[bundleId] || contextLoading.has(bundleId)) return;
    setContextLoading((prev) => new Set([...prev, bundleId]));
    const result = await getServiceContextPreview(bundleId);
    if (result.success) {
      setContextPreviews((prev) => ({ ...prev, [bundleId]: result.data }));
    }
    setContextLoading((prev) => {
      const next = new Set(prev);
      next.delete(bundleId);
      return next;
    });
  }, [contextPreviews, contextLoading]);

  // ── Client selection handler ───────────────────────────────────────────
  function handleClientSelect(id: string) {
    setClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client) {
      setClientServices([]);
      return;
    }
    // Load services from client's active contracts
    if (client.active_contract) {
      // Client may have multiple contracts — but our model returns just one.
      // Use active bundles as the full set, pre-check the contracted one.
      const contracted = new Set([client.active_contract.bundle_id]);
      const services: ServiceSelection[] = activeBundles
        .filter(
          (b) =>
            contracted.has(b.id) || bundleVersions[b.id]
        )
        .map((b) => ({
          bundle_id: b.id,
          pricing_version_id: bundleVersions[b.id]?.id ?? "",
          service_name: b.name,
          checked: contracted.has(b.id),
          suggested_price:
            bundleVersions[b.id]?.suggested_price ?? null,
          override_price: null,
          cost_per_seat: bundleVersions[b.id]?.cost_per_seat ?? null,
        }))
        .filter((s) => s.pricing_version_id);

      // If the contracted bundle isn't in activeBundles, add it
      if (
        client.active_contract &&
        !services.some((s) => s.bundle_id === client.active_contract!.bundle_id)
      ) {
        services.unshift({
          bundle_id: client.active_contract.bundle_id,
          pricing_version_id: client.active_contract.bundle_version_id,
          service_name: client.active_contract.bundle_name,
          checked: true,
          suggested_price: null,
          override_price: null,
          cost_per_seat: null,
        });
      }
      setClientServices(services);
    } else {
      // No active contract — show all available services unchecked
      setClientServices(
        activeBundles
          .filter((b) => bundleVersions[b.id])
          .map((b) => ({
            bundle_id: b.id,
            pricing_version_id: bundleVersions[b.id].id,
            service_name: b.name,
            checked: false,
            suggested_price:
              bundleVersions[b.id]?.suggested_price ?? null,
            override_price: null,
            cost_per_seat: bundleVersions[b.id]?.cost_per_seat ?? null,
          }))
      );
    }
  }

  // ── Prospect: match services ───────────────────────────────────────────
  async function handleMatchServices() {
    setMatchLoading(true);
    try {
      const res = await fetch("/api/ai/match-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_industry: prospectIndustry,
          prospect_size: prospectSize,
          primary_concern: primaryConcern,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const matched: ServiceSelection[] = (
          data.matched_services ?? []
        ).map(
          (m: { bundle_id: string; service_name: string }) => ({
            bundle_id: m.bundle_id,
            pricing_version_id:
              bundleVersions[m.bundle_id]?.id ?? "",
            service_name: m.service_name,
            checked: true,
            suggested_price:
              bundleVersions[m.bundle_id]?.suggested_price ?? null,
            override_price: null,
            cost_per_seat: bundleVersions[m.bundle_id]?.cost_per_seat ?? null,
          })
        );
        setMatchedServices(matched.filter((m) => m.pricing_version_id));
      } else {
        toast.error("Failed to match services");
      }
    } catch {
      toast.error("Failed to match services");
    } finally {
      setMatchLoading(false);
    }
  }

  // ── Generate proposal ──────────────────────────────────────────────────
  const currentServices =
    mode === "client" ? clientServices : matchedServices;
  const checkedServices = currentServices.filter((s) => s.checked);

  const canGenerate =
    checkedServices.length > 0 &&
    (mode === "client" ? !!clientId : !!prospectName.trim());

  async function handleGenerate() {
    setGenerating(true);
    setEditedSections(new Set());

    const services = checkedServices.map((s) => ({
      bundle_id: s.bundle_id,
      pricing_version_id: s.pricing_version_id,
      service_name: s.service_name,
      suggested_price: s.override_price ?? s.suggested_price ?? undefined,
      billing_unit: "per month",
    }));

    try {
      const res = await fetch("/api/ai/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          client_id: mode === "client" ? clientId : undefined,
          prospect_name: mode === "prospect" ? prospectName : undefined,
          prospect_industry:
            mode === "prospect" ? prospectIndustry : undefined,
          prospect_size: mode === "prospect" ? prospectSize : undefined,
          primary_concern:
            mode === "prospect" ? primaryConcern : undefined,
          services,
        }),
      });

      if (res.status === 422) {
        const err = await res.json().catch(() => ({}));
        const items = (err.missing as string[]) ?? [];
        toast.error(
          items.length > 0
            ? `Missing: ${items.join(", ")}`
            : "Insufficient context to generate proposal"
        );
        return;
      }

      if (!res.ok) {
        toast.error("Failed to generate proposal");
        return;
      }

      const content: ProposalContent = await res.json();
      setProposal(content);
      setInputCollapsed(true);

      // Auto-save to DB
      const serviceRefs: ProposalServiceRef[] = checkedServices.map(
        (s) => ({
          bundle_id: s.bundle_id,
          pricing_version_id: s.pricing_version_id,
          service_name: s.service_name,
        })
      );

      startTransition(async () => {
        const result = await createProposalAction({
          client_id: mode === "client" ? clientId : null,
          prospect_name: mode === "prospect" ? prospectName : null,
          prospect_industry:
            mode === "prospect" ? prospectIndustry : null,
          prospect_size: mode === "prospect" ? prospectSize : null,
          services_included: serviceRefs,
          content,
        });
        if (result.success) {
          setProposalId(result.data.id);
          setSaveStatus("saved");
        }
      });
    } catch {
      toast.error("Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  }

  // ── Auto-save on edit (debounced) ──────────────────────────────────────
  const debouncedSave = useCallback(
    (content: ProposalContent) => {
      if (!proposalId) return;
      setSaveStatus("unsaved");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus("saving");
        updateProposalContentAction({
          proposal_id: proposalId,
          content,
        }).then((result) => {
          setSaveStatus(result.success ? "saved" : "unsaved");
        });
      }, 2000);
    },
    [proposalId]
  );

  function updateSection(key: keyof ProposalContent, value: unknown) {
    if (!proposal) return;
    const updated = { ...proposal, [key]: value };
    setProposal(updated);
    setEditedSections((prev) => new Set([...prev, key]));
    debouncedSave(updated);
  }

  // ── Regenerate single section ──────────────────────────────────────────
  async function handleRegenSection(sectionKey: string) {
    setRegenSection(sectionKey);
    try {
      const services = checkedServices.map((s) => ({
        bundle_id: s.bundle_id,
        pricing_version_id: s.pricing_version_id,
        service_name: s.service_name,
        suggested_price: s.override_price ?? s.suggested_price ?? undefined,
        billing_unit: "per month",
      }));

      const res = await fetch("/api/ai/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          client_id: mode === "client" ? clientId : undefined,
          prospect_name: mode === "prospect" ? prospectName : undefined,
          services,
        }),
      });

      if (res.status === 422) {
        const err = await res.json().catch(() => ({}));
        const items = (err.missing as string[]) ?? [];
        toast.error(
          items.length > 0
            ? `Missing: ${items.join(", ")}`
            : "Insufficient context to regenerate"
        );
      } else if (res.ok) {
        const content: ProposalContent = await res.json();
        if (proposal && sectionKey in content) {
          updateSection(
            sectionKey as keyof ProposalContent,
            content[sectionKey as keyof ProposalContent]
          );
        }
      }
    } catch {
      toast.error("Failed to regenerate section");
    } finally {
      setRegenSection(null);
    }
  }

  // ── Regenerate full proposal ───────────────────────────────────────────
  async function handleRegenFull() {
    if (editedSections.size > 0) {
      const confirmed = window.confirm(
        "You have manual edits that will be lost. Regenerate the entire proposal?"
      );
      if (!confirmed) return;
    }
    await handleGenerate();
  }

  // ── Load past proposal ────────────────────────────────────────────────
  function handleLoadProposal(p: Proposal) {
    setProposal(p.content);
    setProposalId(p.id);
    setInputCollapsed(true);
    setEditedSections(new Set());
    setSaveStatus("saved");
    handleTabChange("client");
  }

  // ── Export handlers ────────────────────────────────────────────────────
  async function handleExportPdf(id?: string) {
    const exportId = id ?? proposalId;
    if (!exportId) return;
    setExportingPdf(true);
    startTransition(async () => {
      const result = await exportProposalPdfAction(exportId);
      if (result.success) {
        downloadBase64(result.data.base64, result.data.filename);
        toast.success("PDF exported");
      } else {
        toast.error(result.error);
      }
      setExportingPdf(false);
    });
  }

  async function handleExportDocx(id?: string) {
    const exportId = id ?? proposalId;
    if (!exportId) return;
    setExportingDocx(true);
    startTransition(async () => {
      const result = await exportProposalDocxAction(exportId);
      if (result.success) {
        downloadBase64(result.data.base64, result.data.filename);
        toast.success("Word document exported");
      } else {
        toast.error(result.error);
      }
      setExportingDocx(false);
    });
  }

  // ── Filtered clients ───────────────────────────────────────────────────
  const filteredClients = clientSearch.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients;

  // ── Recipient name for display ─────────────────────────────────────────
  const recipientName =
    mode === "client"
      ? clients.find((c) => c.id === clientId)?.name ?? "Client"
      : prospectName || "Prospect";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Studio"
        description="Generate proposals, build playbooks, and close more business"
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="client">Client Proposals</TabsTrigger>
          <TabsTrigger value="prospect">Prospect Proposals</TabsTrigger>
          <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
          <TabsTrigger value="history">
            Proposal History
            {proposals.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({proposals.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="fractional-cto">Technology Advisory</TabsTrigger>
        </TabsList>

        {/* ── Client Proposals Tab ── */}
        <TabsContent value="client" className="space-y-6">
          {activeBundles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Layers2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Build a service first
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Proposals are built from your services. Design your first service
                  in the Stack Builder, then come back to generate a proposal.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/stack-builder">
                    Open Stack Builder &rarr;
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : !inputCollapsed ? (
            <Card>
              <CardContent className="p-5 space-y-5">
                <ClientInputPanel
                  clients={filteredClients}
                  clientId={clientId}
                  clientSearch={clientSearch}
                  onSearchChange={setClientSearch}
                  onClientSelect={handleClientSelect}
                  services={clientServices}
                  onToggleService={(idx) => {
                    const updated = [...clientServices];
                    const toggled = !updated[idx].checked;
                    updated[idx] = {
                      ...updated[idx],
                      checked: toggled,
                    };
                    setClientServices(updated);
                    if (toggled) fetchContextPreview(updated[idx].bundle_id);
                  }}
                  onOverridePrice={(idx, price) => {
                    const updated = [...clientServices];
                    updated[idx] = { ...updated[idx], override_price: price };
                    setClientServices(updated);
                  }}
                  playbookStatus={playbookStatus}
                  bundleOutcomes={bundleOutcomes}
                  bundleVersions={bundleVersions}
                  onSwitchToEnablement={() => handleTabChange("playbooks")}
                />

                {/* Service context preview */}
                {checkedServices.length > 0 && (
                  <ServiceContextPreviewPanel
                    services={checkedServices}
                    contextPreviews={contextPreviews}
                    contextLoading={contextLoading}
                    bundleOutcomes={bundleOutcomes}
                  />
                )}

                {/* Published packages hint */}
                {publishedPackages.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>
                      {publishedPackages.length} published{" "}
                      {publishedPackages.length === 1 ? "package" : "packages"}{" "}
                      available —{" "}
                      <a
                        href="/services?tab=packages"
                        className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                      >
                        view packages
                      </a>
                    </span>
                  </div>
                )}

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="w-full gap-2"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pitch is drafting your proposal...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Ask Pitch to write this proposal
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Proposal for {recipientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checkedServices.length} service
                    {checkedServices.length !== 1 ? "s" : ""} included
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-xs",
                    saveStatus === "saved"
                      ? "text-muted-foreground"
                      : saveStatus === "saving"
                        ? "text-amber-400"
                        : "text-red-400"
                  )}
                >
                  {saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "saving"
                      ? "Saving..."
                      : "Unsaved changes"}
                </span>
                <button
                  type="button"
                  onClick={() => setInputCollapsed(false)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Generating overlay — Pitch agent */}
          {generating && !proposal && (
            <AgentWorking
              agentId="pitch"
              subtitle={`Writing your proposal for ${recipientName}...`}
            />
          )}

          {/* Proposal output */}
          {proposal && !generating && (
            <>
              <GenerationContextHeader
                services={checkedServices}
                contextPreviews={contextPreviews}
              />
              <ProposalOutput
                content={proposal}
                proposalId={proposalId}
                onUpdateSection={updateSection}
                onRegenSection={handleRegenSection}
                onRegenFull={handleRegenFull}
                editingSection={editingSection}
                onEditSection={setEditingSection}
                regenSection={regenSection}
                saveStatus={saveStatus}
                checkedServices={checkedServices}
                onExportPdf={() => handleExportPdf()}
                onExportDocx={() => handleExportDocx()}
                exportingPdf={exportingPdf}
                exportingDocx={exportingDocx}
              />
            </>
          )}
        </TabsContent>

        {/* ── Prospect Proposals Tab ── */}
        <TabsContent value="prospect" className="space-y-6">
          {activeBundles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Layers2 className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Build a service first
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Proposals are built from your services. Design your first service
                  in the Stack Builder, then come back to generate a proposal.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/stack-builder">
                    Open Stack Builder &rarr;
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : !inputCollapsed ? (
            <Card>
              <CardContent className="p-5 space-y-5">
                <ProspectInputPanel
                  prospectName={prospectName}
                  prospectIndustry={prospectIndustry}
                  prospectSize={prospectSize}
                  primaryConcern={primaryConcern}
                  onNameChange={setProspectName}
                  onIndustryChange={setProspectIndustry}
                  onSizeChange={setProspectSize}
                  onConcernChange={setPrimaryConcern}
                  matchLoading={matchLoading}
                  onMatch={handleMatchServices}
                  matchedServices={matchedServices}
                  onToggleService={(idx) => {
                    const updated = [...matchedServices];
                    const toggled = !updated[idx].checked;
                    updated[idx] = {
                      ...updated[idx],
                      checked: toggled,
                    };
                    setMatchedServices(updated);
                    if (toggled) fetchContextPreview(updated[idx].bundle_id);
                  }}
                  onOverridePrice={(idx, price) => {
                    const updated = [...matchedServices];
                    updated[idx] = { ...updated[idx], override_price: price };
                    setMatchedServices(updated);
                  }}
                  canMatch={!!prospectName.trim()}
                  playbookStatus={playbookStatus}
                  bundleOutcomes={bundleOutcomes}
                  bundleVersions={bundleVersions}
                  onSwitchToEnablement={() => handleTabChange("playbooks")}
                />

                {/* Service context preview */}
                {checkedServices.length > 0 && (
                  <ServiceContextPreviewPanel
                    services={checkedServices}
                    contextPreviews={contextPreviews}
                    contextLoading={contextLoading}
                    bundleOutcomes={bundleOutcomes}
                  />
                )}

                {/* Published packages hint */}
                {publishedPackages.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-border px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>
                      {publishedPackages.length} published{" "}
                      {publishedPackages.length === 1 ? "package" : "packages"}{" "}
                      available —{" "}
                      <a
                        href="/services?tab=packages"
                        className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
                      >
                        view packages
                      </a>
                    </span>
                  </div>
                )}

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || generating}
                  className="w-full gap-2"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pitch is drafting your proposal...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Ask Pitch to write this proposal
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Proposal for {recipientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {checkedServices.length} service
                    {checkedServices.length !== 1 ? "s" : ""} included
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-xs",
                    saveStatus === "saved"
                      ? "text-muted-foreground"
                      : saveStatus === "saving"
                        ? "text-amber-400"
                        : "text-red-400"
                  )}
                >
                  {saveStatus === "saved"
                    ? "Saved"
                    : saveStatus === "saving"
                      ? "Saving..."
                      : "Unsaved changes"}
                </span>
                <button
                  type="button"
                  onClick={() => setInputCollapsed(false)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Generating overlay — Pitch agent */}
          {generating && !proposal && (
            <AgentWorking
              agentId="pitch"
              subtitle={`Writing your proposal for ${recipientName}...`}
            />
          )}

          {/* Proposal output */}
          {proposal && !generating && (
            <>
              <GenerationContextHeader
                services={checkedServices}
                contextPreviews={contextPreviews}
              />
              <ProposalOutput
                content={proposal}
                proposalId={proposalId}
                onUpdateSection={updateSection}
                onRegenSection={handleRegenSection}
                onRegenFull={handleRegenFull}
                editingSection={editingSection}
                onEditSection={setEditingSection}
                regenSection={regenSection}
                saveStatus={saveStatus}
                checkedServices={checkedServices}
                onExportPdf={() => handleExportPdf()}
                onExportDocx={() => handleExportDocx()}
                exportingPdf={exportingPdf}
                exportingDocx={exportingDocx}
              />
            </>
          )}
        </TabsContent>

        {/* ── Playbooks Tab ── */}
        <TabsContent value="playbooks">
          <SalesEnablementPanel
            activeBundles={activeBundles}
            orgName={orgName}
            orgTargetVerticals={orgTargetVerticals}
          />
        </TabsContent>

        {/* ── Proposal History Tab ── */}
        <TabsContent value="history">
          <PastProposals
            proposals={proposals}
            clients={clients}
            onLoad={handleLoadProposal}
            onExportPdf={handleExportPdf}
            onExportDocx={handleExportDocx}
            exportingPdf={exportingPdf}
            exportingDocx={exportingDocx}
          />
        </TabsContent>

        {/* ── Fractional CTO Tab ── */}
        <TabsContent value="fractional-cto">
          <FractionalCTOStudioPanel
            proposal={proposal}
            recipientName={recipientName}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Client Input Panel ───────────────────────────────────────────────────────

function ClientInputPanel({
  clients,
  clientId,
  clientSearch,
  onSearchChange,
  onClientSelect,
  services,
  onToggleService,
  onOverridePrice,
  playbookStatus,
  bundleOutcomes,
  bundleVersions,
  onSwitchToEnablement,
}: {
  clients: ClientWithContracts[];
  clientId: string;
  clientSearch: string;
  onSearchChange: (v: string) => void;
  onClientSelect: (id: string) => void;
  services: ServiceSelection[];
  onToggleService: (idx: number) => void;
  onOverridePrice: (idx: number, price: number | null) => void;
  playbookStatus: Record<string, boolean>;
  bundleOutcomes: Record<string, boolean>;
  bundleVersions: Record<string, BundleVersionInfo>;
  onSwitchToEnablement: (bundleId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Client</Label>
        <Input
          placeholder="Search clients..."
          value={clientSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="mb-2"
        />
        <Select value={clientId} onValueChange={onClientSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.length === 0 ? (
              <SelectItem value="__none" disabled>
                No clients found
              </SelectItem>
            ) : (
              clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {services.length > 0 && (
        <ServiceChecklist
          services={services}
          onToggle={onToggleService}
          onOverridePrice={onOverridePrice}
          playbookStatus={playbookStatus}
          bundleOutcomes={bundleOutcomes}
          bundleVersions={bundleVersions}
          onSwitchToEnablement={onSwitchToEnablement}
        />
      )}
    </div>
  );
}

// ── Prospect Input Panel ─────────────────────────────────────────────────────

function ProspectInputPanel({
  prospectName,
  prospectIndustry,
  prospectSize,
  primaryConcern,
  onNameChange,
  onIndustryChange,
  onSizeChange,
  onConcernChange,
  matchLoading,
  onMatch,
  matchedServices,
  onToggleService,
  onOverridePrice,
  canMatch,
  playbookStatus,
  bundleOutcomes,
  bundleVersions,
  onSwitchToEnablement,
}: {
  prospectName: string;
  prospectIndustry: string;
  prospectSize: string;
  primaryConcern: string;
  onNameChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  onSizeChange: (v: string) => void;
  onConcernChange: (v: string) => void;
  matchLoading: boolean;
  onMatch: () => void;
  matchedServices: ServiceSelection[];
  onToggleService: (idx: number) => void;
  onOverridePrice: (idx: number, price: number | null) => void;
  canMatch: boolean;
  playbookStatus: Record<string, boolean>;
  bundleOutcomes: Record<string, boolean>;
  bundleVersions: Record<string, BundleVersionInfo>;
  onSwitchToEnablement: (bundleId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Prospect name</Label>
          <Input
            value={prospectName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div className="space-y-2">
          <Label>Industry</Label>
          <Select value={prospectIndustry} onValueChange={onIndustryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((ind) => (
                <SelectItem key={ind} value={ind}>
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Company size</Label>
          <Select value={prospectSize} onValueChange={onSizeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-50">1–50 employees</SelectItem>
              <SelectItem value="51-200">51–200 employees</SelectItem>
              <SelectItem value="201-1000">201–1,000 employees</SelectItem>
              <SelectItem value="1000+">1,000+ employees</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Primary concern</Label>
          <Input
            value={primaryConcern}
            onChange={(e) => onConcernChange(e.target.value)}
            placeholder="e.g. ransomware risk, SOC 2 compliance"
          />
        </div>
      </div>

      <Button
        variant="outline"
        onClick={onMatch}
        disabled={matchLoading || !canMatch}
        className="gap-1.5"
      >
        {matchLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        AI Match Services
      </Button>

      {matchedServices.length > 0 && (
        <ServiceChecklist
          services={matchedServices}
          onToggle={onToggleService}
          onOverridePrice={onOverridePrice}
          playbookStatus={playbookStatus}
          bundleOutcomes={bundleOutcomes}
          bundleVersions={bundleVersions}
          onSwitchToEnablement={onSwitchToEnablement}
        />
      )}
    </div>
  );
}

// ── Service Checklist ────────────────────────────────────────────────────────

function ServiceChecklist({
  services,
  onToggle,
  onOverridePrice,
  playbookStatus,
  bundleOutcomes = {},
  bundleVersions = {},
  onSwitchToEnablement,
}: {
  services: ServiceSelection[];
  onToggle: (idx: number) => void;
  onOverridePrice: (idx: number, price: number | null) => void;
  playbookStatus: Record<string, boolean>;
  bundleOutcomes?: Record<string, boolean>;
  bundleVersions?: Record<string, BundleVersionInfo>;
  onSwitchToEnablement: (bundleId: string) => void;
}) {
  function getContextQuality(bundleId: string): {
    quality: "rich" | "partial" | "minimal";
    missing: string[];
  } {
    const hasOutcome = !!bundleOutcomes[bundleId];
    const hasVersion = !!bundleVersions[bundleId];
    const hasPlaybook = !!playbookStatus[bundleId];
    const missing: string[] = [];

    if (!hasOutcome) missing.push("outcome");
    if (!hasVersion) missing.push("pricing version");
    if (!hasPlaybook) missing.push("playbook");

    if (hasOutcome && hasVersion && hasPlaybook) {
      return { quality: "rich", missing: [] };
    }
    if (missing.length >= 2) {
      return { quality: "minimal", missing };
    }
    return { quality: "partial", missing };
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          Services to include
        </Label>
        {services.map((s, i) => {
          const ctx = getContextQuality(s.bundle_id);
          return (
            <label
              key={s.bundle_id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <input
                type="checkbox"
                checked={s.checked}
                onChange={() => onToggle(i)}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground flex-1">
                {s.service_name}
              </span>
              <ContextQualityBadge
                quality={ctx.quality}
                missing={ctx.missing}
              />
              {playbookStatus[s.bundle_id] ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                      Playbook ready
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      A sales playbook exists for this service and will be used to
                      strengthen this proposal
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onSwitchToEnablement(s.bundle_id);
                      }}
                      className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
                    >
                      No playbook
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      Build a playbook in Sales Materials to improve proposals for
                      this service
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {s.suggested_price !== null && s.checked && (
                <div className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={s.override_price ?? s.suggested_price}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onOverridePrice(i, isNaN(val) ? null : val);
                    }}
                    className="h-6 w-20 text-xs font-mono px-1.5"
                  />
                  {s.cost_per_seat != null && s.cost_per_seat > 0 && (() => {
                    const price = s.override_price ?? s.suggested_price ?? 0;
                    const margin = price > 0 ? (price - s.cost_per_seat) / price : 0;
                    return <MarginHealthBadge margin={margin} showLabel={false} />;
                  })()}
                  {s.override_price !== null && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOverridePrice(i, null);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground"
                      title="Reset to suggested price"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
              {s.suggested_price !== null && !s.checked && (
                <span className="text-xs text-muted-foreground font-mono">
                  {formatCurrency(s.suggested_price)}/mo
                </span>
              )}
            </label>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ── Proposal Output ──────────────────────────────────────────────────────────

function ProposalOutput({
  content,
  proposalId,
  onUpdateSection,
  onRegenSection,
  onRegenFull,
  editingSection,
  onEditSection,
  regenSection,
  saveStatus,
  checkedServices,
  onExportPdf,
  onExportDocx,
  exportingPdf,
  exportingDocx,
}: {
  content: ProposalContent;
  proposalId: string | null;
  onUpdateSection: (key: keyof ProposalContent, value: unknown) => void;
  onRegenSection: (key: string) => void;
  onRegenFull: () => void;
  editingSection: string | null;
  onEditSection: (key: string | null) => void;
  regenSection: string | null;
  saveStatus: "saved" | "saving" | "unsaved";
  checkedServices: ServiceSelection[];
  onExportPdf: () => void;
  onExportDocx: () => void;
  exportingPdf: boolean;
  exportingDocx: boolean;
}) {
  const { usage, limits } = usePlanContext();
  const exportsRemaining = limits.exportsPerMonth === Infinity
    ? null
    : limits.exportsPerMonth - (usage?.exportsCount ?? 0);

  return (
    <div className="space-y-0">
      {/* Proposal header bar — Pitch agent */}
      <div className="flex items-center justify-between mb-5">
        <AgentBadge agentId="pitch" size="md" />
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenFull}
          className="gap-1.5 h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerate Full Proposal
        </Button>
      </div>

      {/* Proposal sections — document-like layout */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {/* Executive Summary */}
        <EditableSection
          title="Executive Summary"

          value={content.executive_summary}
          onUpdate={(v) => onUpdateSection("executive_summary", v)}
          onRegen={() => onRegenSection("executive_summary")}
          isEditing={editingSection === "executive_summary"}
          onStartEdit={() => onEditSection("executive_summary")}
          onStopEdit={() => onEditSection(null)}
          isRegenerating={regenSection === "executive_summary"}
        />

        {/* Services Overview */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Services Overview
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRegenSection("services_overview")}
              disabled={regenSection === "services_overview"}
              className="h-6 text-xs gap-1 text-muted-foreground"
            >
              {regenSection === "services_overview" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Regenerate
            </Button>
          </div>
          <div className="space-y-6">
            {content.services_overview.map((svc, i) => (
              <div key={i} className="space-y-2">
                <h4 className="text-base font-medium text-foreground">
                  {svc.name}
                </h4>
                {editingSection === `services_overview_${i}` ? (
                  <div className="space-y-2">
                    <Textarea
                      value={svc.description}
                      onChange={(e) => {
                        const updated = [...content.services_overview];
                        updated[i] = { ...updated[i], description: e.target.value };
                        onUpdateSection("services_overview", updated);
                      }}
                      rows={6}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => onEditSection(null)}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <div
                    className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed cursor-text hover:bg-white/[0.02] rounded-md p-2 -m-2 transition-colors"
                    onClick={() => onEditSection(`services_overview_${i}`)}
                  >
                    {svc.description || (
                      <span className="italic">Click to edit...</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Pricing Summary
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkedServices.map((s) => (
                <TableRow key={s.bundle_id}>
                  <TableCell className="font-medium">
                    {s.service_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {s.suggested_price !== null
                      ? formatCurrency(s.suggested_price)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    Monthly
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-border">
                <TableCell className="font-semibold">Total MRR</TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(
                    checkedServices.reduce(
                      (sum, s) => sum + (s.suggested_price ?? 0),
                      0
                    )
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  Monthly
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Why Us */}
        <EditableSection
          title="Why Us"

          value={content.why_us}
          onUpdate={(v) => onUpdateSection("why_us", v)}
          onRegen={() => onRegenSection("why_us")}
          isEditing={editingSection === "why_us"}
          onStartEdit={() => onEditSection("why_us")}
          onStopEdit={() => onEditSection(null)}
          isRegenerating={regenSection === "why_us"}
        />

        {/* Risk Snapshot */}
        <EditableSection
          title="Risk Snapshot"

          value={content.risk_snapshot}
          onUpdate={(v) => onUpdateSection("risk_snapshot", v)}
          onRegen={() => onRegenSection("risk_snapshot")}
          isEditing={editingSection === "risk_snapshot"}
          onStartEdit={() => onEditSection("risk_snapshot")}
          onStopEdit={() => onEditSection(null)}
          isRegenerating={regenSection === "risk_snapshot"}
        />
      </div>

      {/* Export footer */}
      {proposalId && (
        <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-3 rounded-lg border border-border bg-card/95 backdrop-blur px-4 py-3">
          <span
            className={cn(
              "text-xs mr-auto",
              saveStatus === "saved"
                ? "text-muted-foreground"
                : saveStatus === "saving"
                  ? "text-amber-400"
                  : "text-red-400"
            )}
          >
            {saveStatus === "saved"
              ? "All changes saved"
              : saveStatus === "saving"
                ? "Saving..."
                : "Unsaved changes"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onExportDocx}
            disabled={exportingDocx}
            className="gap-1.5"
          >
            {exportingDocx ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export Word (.docx)
          </Button>
          <Button
            size="sm"
            onClick={onExportPdf}
            disabled={exportingPdf}
            className="gap-1.5"
          >
            {exportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export PDF
          </Button>
          {exportsRemaining !== null && exportsRemaining <= 5 && (
            <span className="text-[11px] ml-1" style={{ color: "#EF9F27", fontFamily: "var(--font-mono-alt)" }}>
              {exportsRemaining} export{exportsRemaining !== 1 ? "s" : ""} remaining
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Editable Section ─────────────────────────────────────────────────────────

function EditableSection({
  title,
  value,
  onUpdate,
  onRegen,
  isEditing,
  onStartEdit,
  onStopEdit,
  isRegenerating,
}: {
  title: string;
  value: string;
  onUpdate: (v: string) => void;
  onRegen: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  isRegenerating: boolean;
}) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegen}
          disabled={isRegenerating}
          className="h-6 text-xs gap-1 text-muted-foreground"
        >
          {isRegenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Regenerate
        </Button>
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => onUpdate(e.target.value)}
            rows={6}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs"
            onClick={onStopEdit}
          >
            Done
          </Button>
        </div>
      ) : (
        <div
          className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed cursor-text hover:bg-white/[0.02] rounded-md p-2 -m-2 transition-colors"
          onClick={onStartEdit}
        >
          {value || <span className="italic">Click to edit...</span>}
        </div>
      )}
    </div>
  );
}

// ── Past Proposals List ──────────────────────────────────────────────────────

function PastProposals({
  proposals,
  clients,
  onLoad,
  onExportPdf,
  onExportDocx,
  exportingPdf,
  exportingDocx,
}: {
  proposals: Proposal[];
  clients: ClientWithContracts[];
  onLoad: (p: Proposal) => void;
  onExportPdf: (id: string) => void;
  onExportDocx: (id: string) => void;
  exportingPdf: boolean;
  exportingDocx: boolean;
}) {
  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            No proposals generated yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Select a client or describe a prospect and the AI will write a complete, outcome-anchored proposal in seconds.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((p) => {
              const name = p.client_id
                ? clientMap.get(p.client_id) ?? "Client"
                : p.prospect_name ?? "Prospect";
              const serviceCount = p.services_included?.length ?? 0;
              const serviceNames = (p.services_included ?? [])
                .map((s) => s.service_name)
                .join(", ");

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>
                    <span
                      className="text-sm text-muted-foreground cursor-help"
                      title={serviceNames}
                    >
                      {serviceCount} service{serviceCount !== 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        p.status as "draft" | "active" | "archived"
                      }
                      label={
                        p.status === "draft"
                          ? "Draft"
                          : p.status === "sent"
                            ? "Sent"
                            : "Archived"
                      }
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" suppressHydrationWarning>
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLoad(p)}
                        className="h-7 text-xs"
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onExportPdf(p.id)}
                        disabled={exportingPdf}
                        className="h-7 text-xs"
                      >
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onExportDocx(p.id)}
                        disabled={exportingDocx}
                        className="h-7 text-xs"
                      >
                        DOCX
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Service Context Preview Panel ─────────────────────────────────────────────

function ServiceContextPreviewPanel({
  services,
  contextPreviews,
  contextLoading,
  bundleOutcomes,
}: {
  services: ServiceSelection[];
  contextPreviews: Record<string, ServiceContextPreview>;
  contextLoading: Set<string>;
  bundleOutcomes: Record<string, boolean>;
}) {
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  function toggleService(bundleId: string) {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Check for services missing outcomes
  const missingOutcomes = services.filter(
    (s) => s.checked && !bundleOutcomes[s.bundle_id]
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        Generation context
      </Label>

      {/* No outcomes warning */}
      {missingOutcomes.length > 0 && (
        <div className="flex items-start gap-2 text-xs rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-amber-400 font-medium">
              {missingOutcomes.length === 1
                ? `${missingOutcomes[0].service_name} has no outcomes defined`
                : `${missingOutcomes.length} services have no outcomes defined`}
            </span>
            <span className="text-muted-foreground">
              {" — "}proposals are stronger with outcome statements.{" "}
              <a
                href={`/services/${missingOutcomes[0].bundle_id}/edit?step=outcome`}
                className="text-primary hover:text-primary/80 underline-offset-2 hover:underline"
              >
                Add outcomes
              </a>
            </span>
          </div>
        </div>
      )}

      {/* Service context cards */}
      {services
        .filter((s) => s.checked)
        .map((s) => {
          const ctx = contextPreviews[s.bundle_id];
          const loading = contextLoading.has(s.bundle_id);
          const expanded = expandedServices.has(s.bundle_id);

          return (
            <div
              key={s.bundle_id}
              className="rounded-lg border border-border bg-card/50"
            >
              <button
                type="button"
                onClick={() => toggleService(s.bundle_id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground flex-1">
                  {ctx?.serviceName ?? s.service_name}
                  {ctx?.serviceSubtitle && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      — {ctx.serviceSubtitle}
                    </span>
                  )}
                </span>
                {loading && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                {ctx && (
                  <span className="text-[10px] text-muted-foreground">
                    {ctx.outcomes.length} outcome
                    {ctx.outcomes.length !== 1 ? "s" : ""}
                    {ctx.translatedCapabilities.length > 0 &&
                      ` · ${ctx.translatedCapabilities.length} capabilities`}
                  </span>
                )}
              </button>

              {expanded && ctx && (
                <div className="px-3 pb-3 space-y-2">
                  {/* Compliance frameworks */}
                  {ctx.complianceFrameworks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ctx.complianceFrameworks.map((fw) => (
                        <span
                          key={fw}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded"
                        >
                          <Shield className="h-2.5 w-2.5" />
                          {fw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Outcomes */}
                  {ctx.outcomes.length > 0 && (
                    <DisclosureList
                      label="Outcomes"
                      icon={<Target className="h-3 w-3" />}
                      items={ctx.outcomes.map((o) => o.statement)}
                      sectionKey={`${s.bundle_id}-outcomes`}
                      expandedSections={expandedSections}
                      onToggle={toggleSection}
                    />
                  )}

                  {/* Translated capabilities */}
                  {ctx.translatedCapabilities.length > 0 && (
                    <DisclosureList
                      label="Capabilities (client-facing)"
                      items={ctx.translatedCapabilities.map(
                        (c) => `${c.clientDescription}: ${c.outcomeContribution}`
                      )}
                      sectionKey={`${s.bundle_id}-capabilities`}
                      expandedSections={expandedSections}
                      onToggle={toggleSection}
                    />
                  )}

                  {/* Additional services */}
                  {ctx.additionalServices.length > 0 && (
                    <DisclosureList
                      label="Add-on services"
                      items={ctx.additionalServices.map(
                        (a) => `${a.name}: ${a.clientDescription}`
                      )}
                      sectionKey={`${s.bundle_id}-addsvcs`}
                      expandedSections={expandedSections}
                      onToggle={toggleSection}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

// ── Disclosure List (collapsible sub-section) ─────────────────────────────────

function DisclosureList({
  label,
  icon,
  items,
  sectionKey,
  expandedSections,
  onToggle,
}: {
  label: string;
  icon?: React.ReactNode;
  items: string[];
  sectionKey: string;
  expandedSections: Set<string>;
  onToggle: (key: string) => void;
}) {
  const expanded = expandedSections.has(sectionKey);

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {icon}
        {label}
        <span className="text-[10px]">({items.length})</span>
      </button>
      {expanded && (
        <ul className="mt-1 ml-5 space-y-0.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="text-xs text-muted-foreground leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Generation Context Header ─────────────────────────────────────────────────

function GenerationContextHeader({
  services,
  contextPreviews,
}: {
  services: ServiceSelection[];
  contextPreviews: Record<string, ServiceContextPreview>;
}) {
  const checked = services.filter((s) => s.checked);
  const totalOutcomes = checked.reduce((sum, s) => {
    const ctx = contextPreviews[s.bundle_id];
    return sum + (ctx?.outcomes.length ?? 0);
  }, 0);
  const totalCapabilities = checked.reduce((sum, s) => {
    const ctx = contextPreviews[s.bundle_id];
    return sum + (ctx?.translatedCapabilities.length ?? 0);
  }, 0);
  const frameworks = [
    ...new Set(
      checked.flatMap(
        (s) => contextPreviews[s.bundle_id]?.complianceFrameworks ?? []
      )
    ),
  ];

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground rounded-lg border border-border bg-card/50 px-3 py-2">
      <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      <span>
        Generated from {totalOutcomes} outcome
        {totalOutcomes !== 1 ? "s" : ""}
        {totalCapabilities > 0 &&
          `, ${totalCapabilities} translated capabilit${totalCapabilities !== 1 ? "ies" : "y"}`}
        {frameworks.length > 0 && (
          <>
            {" · "}
            {frameworks.map((fw) => (
              <span
                key={fw}
                className="inline-flex items-center gap-0.5 text-blue-400"
              >
                <Shield className="h-2.5 w-2.5" />
                {fw}
              </span>
            ))}
          </>
        )}
      </span>
    </div>
  );
}
