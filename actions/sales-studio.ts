"use server";

import { getCurrentProfile } from "@/lib/db/profiles";
import { requireOrgMembership } from "@/lib/org-context";
import { getBundleById } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { getVersionsByBundleId, getVersionById } from "@/lib/db/bundle-versions";
import { getPlaybookByBundleId } from "@/lib/db/enablement";
import { buildSalesStudioContext } from "@/lib/ai/sales-studio-context";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ActionResult, ToolCategory } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ServiceDetailsForPlaybook {
  service_name: string;
  outcome_type: string;
  outcome_statement: string | null;
  target_vertical: string | null;
  target_persona: string | null;
  service_capabilities: { name: string; description: string }[];
  assigned_tools: { name: string; vendor: string; domain: string }[];
}

// ── Server Action ────────────────────────────────────────────────────────────

export async function getServiceDetailsForPlaybook(
  bundleId: string
): Promise<ActionResult<ServiceDetailsForPlaybook>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    // Verify bundle exists and belongs to org
    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Service not found" };
    }

    // Fetch outcome data
    const outcome = await getServiceOutcome(bundleId);

    // Fetch latest version tools
    const versions = await getVersionsByBundleId(bundleId);
    let assignedTools: { name: string; vendor: string; domain: string }[] = [];

    if (versions.length > 0) {
      const latestVersion = await getVersionById(versions[0].id);
      if (latestVersion?.tools) {
        assignedTools = latestVersion.tools
          .filter((vt) => vt.tool)
          .map((vt) => ({
            name: vt.tool!.name,
            vendor: vt.tool!.vendor,
            domain:
              CATEGORY_LABELS[vt.tool!.category as ToolCategory] ??
              vt.tool!.category,
          }));
      }
    }

    return {
      success: true,
      data: {
        service_name: bundle.name,
        outcome_type: outcome?.outcome_type ?? "",
        outcome_statement: outcome?.outcome_statement ?? null,
        target_vertical: outcome?.target_vertical ?? null,
        target_persona: outcome?.target_persona ?? null,
        service_capabilities: (outcome?.service_capabilities ?? []).map(
          (c) => ({ name: c.name, description: c.description })
        ),
        assigned_tools: assignedTools,
      },
    };
  } catch {
    return { success: false, error: "Failed to load service details" };
  }
}

// ── Cached Playbook ─────────────────────────────────────────────────────────

export interface CachedPlaybook {
  playbook_content: Record<string, unknown>;
  playbook_generated_at: string;
}

export async function getCachedPlaybook(
  bundleId: string
): Promise<ActionResult<CachedPlaybook | null>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const result = await getPlaybookByBundleId(orgId, bundleId);

    if (!result || !result.playbook_content || !result.playbook_generated_at) {
      return { success: true, data: null };
    }

    return {
      success: true,
      data: {
        playbook_content: result.playbook_content,
        playbook_generated_at: result.playbook_generated_at,
      },
    };
  } catch {
    return { success: false, error: "Failed to load cached playbook" };
  }
}

// ── Service Context Preview ─────────────────────────────────────────────────

export interface ServiceContextPreview {
  serviceName: string;
  serviceSubtitle: string | null;
  complianceFrameworks: string[];
  outcomes: { statement: string; description: string | null }[];
  translatedCapabilities: { clientDescription: string; outcomeContribution: string }[];
  additionalServices: { name: string; clientDescription: string }[];
}

export async function getServiceContextPreview(
  bundleId: string
): Promise<ActionResult<ServiceContextPreview>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const bundle = await getBundleById(bundleId);
    if (!bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Service not found" };
    }

    const ctx = await buildSalesStudioContext(bundleId);

    return {
      success: true,
      data: {
        serviceName: ctx.serviceName,
        serviceSubtitle: ctx.serviceSubtitle,
        complianceFrameworks: ctx.complianceFrameworks,
        outcomes: ctx.outcomes,
        translatedCapabilities: ctx.toolsTranslated,
        additionalServices: ctx.additionalServices.map((s) => ({
          name: s.name,
          clientDescription: s.clientDescription,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to load service context" };
  }
}
