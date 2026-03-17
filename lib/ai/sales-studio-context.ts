// Sales Studio context builder.
// Single data assembly point for all Sales Studio AI generation calls.

import { getBundleById } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import {
  getVersionsByBundleId,
  getVersionById,
} from "@/lib/db/bundle-versions";
import { getAdditionalServicesByVersionId } from "@/lib/db/additional-services";
import { getClientById } from "@/lib/db/clients";
import { getContractsByClientId } from "@/lib/db/client-contracts";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  translateToolsToOutcomeLanguage,
  translateAdditionalService,
} from "./tool-translator";
import type { ToolCategory } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SalesStudioContext {
  serviceName: string;
  serviceSubtitle: string | null;
  serviceDescription: string | null;
  complianceFrameworks: string[];

  outcomes: {
    statement: string;
    description: string | null;
  }[];

  toolsInternal: {
    name: string;
    category: string;
    vendor: string | null;
  }[];

  toolsTranslated: {
    clientDescription: string;
    outcomeContribution: string;
  }[];

  capabilities: {
    name: string;
    description: string;
  }[];

  additionalServices: {
    name: string;
    description: string | null;
    clientDescription: string;
  }[];

  client?: {
    name: string;
    industry: string | null;
    size: string | null;
    primaryConcern: string | null;
    existingContracts: string | null;
  };

  pricing?: {
    monthlyTotal: number;
    tierName: string | null;
  };
}

// ── Builder ──────────────────────────────────────────────────────────────────

export async function buildSalesStudioContext(
  serviceId: string,
  clientId?: string
): Promise<SalesStudioContext> {
  // 1. Fetch service + outcome + versions in parallel
  const [bundle, outcome, versions] = await Promise.all([
    getBundleById(serviceId),
    getServiceOutcome(serviceId),
    getVersionsByBundleId(serviceId),
  ]);

  if (!bundle) throw new Error("Service not found");

  // 2. Fetch tools from latest version
  const latestVersion = versions[0] ?? null;
  let toolsRaw: { name: string; vendor: string; category: string }[] = [];
  let versionId: string | null = null;

  if (latestVersion) {
    versionId = latestVersion.id;
    const versionWithTools = await getVersionById(latestVersion.id);
    if (versionWithTools?.tools) {
      toolsRaw = versionWithTools.tools
        .filter((vt) => vt.tool)
        .map((vt) => ({
          name: vt.tool!.name,
          vendor: vt.tool!.vendor,
          category:
            CATEGORY_LABELS[vt.tool!.category as ToolCategory] ??
            vt.tool!.category,
        }));
    }
  }

  // 3. Translate tools
  const toolsTranslated = translateToolsToOutcomeLanguage(
    toolsRaw.map((t) => ({
      name: t.name,
      vendor: t.vendor,
      category: t.category,
    }))
  );

  // 4. Fetch additional services
  let additionalServicesRaw: {
    name: string;
    category: string;
    description: string | null;
  }[] = [];
  if (versionId) {
    const addSvcs = await getAdditionalServicesByVersionId(versionId);
    additionalServicesRaw = addSvcs.map((as) => ({
      name: as.additional_service.name,
      category: as.additional_service.category,
      description: as.additional_service.description,
    }));
  }

  // 5. Build outcomes list from selected_outcomes + outcome_statement
  const outcomes: { statement: string; description: string | null }[] = [];

  if (outcome?.selected_outcomes && outcome.selected_outcomes.length > 0) {
    for (const so of outcome.selected_outcomes) {
      outcomes.push({
        statement: so.statement,
        description: so.description ?? null,
      });
    }
  }

  // Also include the primary outcome statement if present and not duplicated
  if (outcome?.outcome_statement) {
    const alreadyIncluded = outcomes.some(
      (o) => o.statement === outcome.outcome_statement
    );
    if (!alreadyIncluded) {
      outcomes.push({
        statement: outcome.outcome_statement,
        description: null,
      });
    }
  }

  // 6. Build capabilities
  const capabilities = (outcome?.service_capabilities ?? []).map((c) => ({
    name: c.name,
    description: c.description,
  }));

  // 7. Client context
  let clientContext: SalesStudioContext["client"] | undefined;
  if (clientId) {
    const [client, contracts] = await Promise.all([
      getClientById(clientId),
      getContractsByClientId(clientId),
    ]);
    if (client) {
      const contractSummary = contracts
        .filter((c) => c.status === "active")
        .map((c) => `${c.bundle_name} (${c.seat_count} seats)`)
        .join(", ");
      clientContext = {
        name: client.name,
        industry: client.industry || null,
        size: null,
        primaryConcern: null,
        existingContracts: contractSummary || null,
      };
    }
  }

  // 8. Pricing
  let pricing: SalesStudioContext["pricing"] | undefined;
  if (latestVersion?.computed_mrr) {
    pricing = {
      monthlyTotal: Number(latestVersion.computed_mrr),
      tierName: null,
    };
  }

  return {
    serviceName: bundle.name,
    serviceSubtitle: bundle.subtitle ?? null,
    serviceDescription: bundle.description || null,
    complianceFrameworks: bundle.compliance_frameworks ?? [],
    outcomes,
    toolsInternal: toolsRaw.map((t) => ({
      name: t.name,
      category: t.category,
      vendor: t.vendor,
    })),
    toolsTranslated: toolsTranslated.map((t) => ({
      clientDescription: t.clientDescription,
      outcomeContribution: t.outcomeContribution,
    })),
    capabilities,
    additionalServices: additionalServicesRaw.map((as) => ({
      name: as.name,
      description: as.description,
      clientDescription: translateAdditionalService(
        as.name,
        as.category,
        as.description
      ),
    })),
    client: clientContext,
    pricing,
  };
}
