import { getOrgById } from "@/lib/db/orgs";
import { getOrgSettings } from "@/lib/db/org-settings";
import { getOnboardingProfile } from "@/lib/db/org-settings";
import { getBundleById, getBundles } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { getVersionsByBundleId } from "@/lib/db/bundle-versions";
import { getClientById } from "@/lib/db/clients";
import { getContractsByClientId } from "@/lib/db/client-contracts";
import { getClients } from "@/lib/db/clients";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";

export interface AIContext {
  org_context: {
    org_name: string;
    workspace_name: string;
    default_target_margin_pct: number;
    default_overhead_pct: number;
    default_labor_pct: number;
    target_verticals?: string[] | null;
    buyer_personas?: string[] | null;
    services_offered?: string[] | null;
    sales_model?: string | null;
    delivery_models?: string[] | null;
    company_size?: string | null;
    compliance_targets?: string[] | null;
    additional_context?: string | null;
  };
  service_context?: {
    bundle_id: string;
    bundle_name: string;
    bundle_type: string;
    outcome_type?: string | null;
    outcome_statement?: string | null;
    target_vertical?: string | null;
    target_persona?: string | null;
    service_capabilities?: Array<{ name: string; description: string }>;
    versions?: Array<{
      version_number: number;
      seat_count: number;
      computed_suggested_price: number | null;
      computed_true_cost_per_seat: number | null;
      computed_margin_post_discount: number | null;
      tools?: Array<{ tool_id: string; tool_name: string; category: string }>;
    }>;
  };
  client_context?: {
    client_id: string;
    client_name: string;
    industry: string;
    status: string;
    contracts?: Array<{
      bundle_name: string;
      seat_count: number;
      monthly_revenue: number;
      margin_pct: number;
      end_date: string;
      status: string;
    }>;
  };
  portfolio_context?: {
    bundles: Array<{
      bundle_id: string;
      name: string;
      bundle_type: string;
      status: string;
      completeness_pct?: number;
      layers_complete?: number;
    }>;
    total_clients?: number;
  };
}

export async function buildAIContext(params: {
  orgId: string;
  bundleId?: string;
  clientId?: string;
  includePortfolio?: boolean;
}): Promise<AIContext> {
  const { orgId, bundleId, clientId, includePortfolio } = params;

  // Always fetch org context
  const [org, settings, profile] = await Promise.all([
    getOrgById(orgId),
    getOrgSettings(orgId),
    getOnboardingProfile(orgId),
  ]);

  const context: AIContext = {
    org_context: {
      org_name: org?.name ?? "Unknown",
      workspace_name: settings?.workspace_name ?? "Workspace",
      default_target_margin_pct: settings?.default_target_margin_pct ?? 0.35,
      default_overhead_pct: settings?.default_overhead_pct ?? 0.1,
      default_labor_pct: settings?.default_labor_pct ?? 0.15,
      target_verticals: profile?.target_verticals,
      buyer_personas: profile?.buyer_personas,
      services_offered: profile?.services_offered,
      sales_model: profile?.sales_model,
      delivery_models: profile?.delivery_models,
      company_size: profile?.company_size,
      compliance_targets: profile?.compliance_targets,
      additional_context: profile?.additional_context,
    },
  };

  // Optional: service context
  if (bundleId) {
    const [bundle, outcome, versions] = await Promise.all([
      getBundleById(bundleId),
      getServiceOutcome(bundleId),
      getVersionsByBundleId(bundleId),
    ]);

    if (bundle) {
      context.service_context = {
        bundle_id: bundle.id,
        bundle_name: bundle.name,
        bundle_type: bundle.bundle_type,
        outcome_type: outcome?.outcome_type,
        outcome_statement: outcome?.outcome_statement,
        target_vertical: outcome?.target_vertical,
        target_persona: outcome?.target_persona,
        service_capabilities: outcome?.service_capabilities,
        versions: versions.slice(0, 3).map((v) => ({
          version_number: v.version_number,
          seat_count: v.seat_count,
          computed_suggested_price: v.computed_suggested_price,
          computed_true_cost_per_seat: v.computed_true_cost_per_seat,
          computed_margin_post_discount: v.computed_margin_post_discount,
        })),
      };
    }
  }

  // Optional: client context
  if (clientId) {
    const [client, contracts] = await Promise.all([
      getClientById(clientId),
      getContractsByClientId(clientId),
    ]);

    if (client) {
      context.client_context = {
        client_id: client.id,
        client_name: client.name,
        industry: client.industry,
        status: client.status,
        contracts: contracts.map((c) => ({
          bundle_name: c.bundle_name,
          seat_count: c.seat_count,
          monthly_revenue: c.monthly_revenue,
          margin_pct: c.margin_pct,
          end_date: c.end_date,
          status: c.status,
        })),
      };
    }
  }

  // Optional: portfolio context
  if (includePortfolio) {
    const [bundles, completeness, clients] = await Promise.all([
      getBundles(orgId),
      getAllServiceCompleteness(orgId),
      getClients(orgId),
    ]);

    const completenessMap = new Map(
      completeness.map((c) => [c.bundle_id, c])
    );

    context.portfolio_context = {
      bundles: bundles.map((b) => ({
        bundle_id: b.id,
        name: b.name,
        bundle_type: b.bundle_type,
        status: b.status,
        completeness_pct: completenessMap.get(b.id)?.completeness_pct,
        layers_complete: completenessMap.get(b.id)?.layers_complete,
      })),
      total_clients: clients.length,
    };
  }

  return context;
}
