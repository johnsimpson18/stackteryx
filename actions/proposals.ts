"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createProposal,
  updateProposal,
  getProposalById,
} from "@/lib/db/proposals";
import { getCurrentProfile } from "@/lib/db/profiles";
import { requireOrgMembership } from "@/lib/org-context";
import { getOrgSettings } from "@/lib/db/org-settings";
import type {
  ActionResult,
  Proposal,
  ProposalContent,
  ProposalServiceRef,
  ProposalStatus,
} from "@/lib/types";
import { checkLimit, incrementUsage } from "@/actions/billing";

// ── Schemas ──────────────────────────────────────────────────────────────────

const serviceRefSchema = z.object({
  bundle_id: z.string().uuid(),
  pricing_version_id: z.string().uuid(),
  service_name: z.string(),
});

const proposalContentSchema = z.object({
  executive_summary: z.string(),
  services_overview: z.array(
    z.object({ name: z.string(), description: z.string() })
  ),
  pricing_summary: z.string(),
  why_us: z.string(),
  risk_snapshot: z.string(),
});

const createProposalSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  prospect_name: z.string().nullable().optional(),
  prospect_industry: z.string().nullable().optional(),
  prospect_size: z.string().nullable().optional(),
  services_included: z.array(serviceRefSchema),
  content: proposalContentSchema,
});

// ── Create proposal ──────────────────────────────────────────────────────────

export async function createProposalAction(
  formData: unknown
): Promise<ActionResult<Proposal>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const parsed = createProposalSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const proposal = await createProposal({
      org_id: orgId,
      ...parsed.data,
    });

    // Log agent activity (fire-and-forget)
    try {
      const { logAgentActivity } = await import("@/lib/agents/log-activity");
      const name = parsed.data.prospect_name ?? "a client";
      logAgentActivity({
        orgId,
        agentId: "pitch",
        activityType: "generation",
        title: `Pitch wrote a client proposal for ${name}`,
        entityType: "proposal",
        entityId: proposal.id,
        entityName: name,
      });
    } catch { /* never block main action */ }

    revalidatePath("/sales-studio");
    revalidatePath("/dashboard");
    return { success: true, data: proposal };
  } catch {
    return { success: false, error: "Failed to create proposal" };
  }
}

// ── Update proposal content ──────────────────────────────────────────────────

const updateContentSchema = z.object({
  proposal_id: z.string().uuid(),
  content: proposalContentSchema,
});

export async function updateProposalContentAction(
  formData: unknown
): Promise<ActionResult<Proposal>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const parsed = updateContentSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    const existing = await getProposalById(parsed.data.proposal_id);
    if (!existing || existing.org_id !== orgId) {
      return { success: false, error: "Proposal not found" };
    }

    const updated = await updateProposal(parsed.data.proposal_id, {
      content: parsed.data.content,
    });

    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update proposal" };
  }
}

// ── Update proposal status ───────────────────────────────────────────────────

export async function updateProposalStatusAction(
  proposalId: string,
  status: ProposalStatus
): Promise<ActionResult<Proposal>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const existing = await getProposalById(proposalId);
    if (!existing || existing.org_id !== orgId) {
      return { success: false, error: "Proposal not found" };
    }

    const updated = await updateProposal(proposalId, { status });

    revalidatePath("/sales-studio");
    return { success: true, data: updated };
  } catch {
    return { success: false, error: "Failed to update status" };
  }
}

// ── Export proposal as PDF ───────────────────────────────────────────────────

export async function exportProposalPdfAction(
  proposalId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();
    const settings = await getOrgSettings(orgId);

    const proposal = await getProposalById(proposalId);
    if (!proposal || proposal.org_id !== orgId) {
      return { success: false, error: "Proposal not found" };
    }

    // Plan limit check — export
    const exportLimit = await checkLimit("exportsPerMonth");
    if (!exportLimit.allowed) {
      return { success: false, error: "LIMIT_REACHED" };
    }

    const { generateProposalPdf } = await import("@/lib/proposal-export");
    const orgName = settings?.workspace_name ?? "Our MSP";
    const recipientName =
      proposal.prospect_name ??
      (proposal.client_id ? "Client" : "Prospect");

    const buffer = await generateProposalPdf({
      orgName,
      recipientName,
      content: proposal.content,
    });

    await incrementUsage("export");

    const slug = recipientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `proposal-${slug}.pdf`;

    return {
      success: true,
      data: { base64: buffer.toString("base64"), filename },
    };
  } catch {
    return { success: false, error: "Failed to generate PDF" };
  }
}

// ── Export proposal as DOCX ──────────────────────────────────────────────────

export async function exportProposalDocxAction(
  proposalId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();
    const settings = await getOrgSettings(orgId);

    const proposal = await getProposalById(proposalId);
    if (!proposal || proposal.org_id !== orgId) {
      return { success: false, error: "Proposal not found" };
    }

    // Plan limit check — export
    const exportLimit = await checkLimit("exportsPerMonth");
    if (!exportLimit.allowed) {
      return { success: false, error: "LIMIT_REACHED" };
    }

    const { generateProposalDocx } = await import("@/lib/proposal-export");
    const orgName = settings?.workspace_name ?? "Our MSP";
    const recipientName =
      proposal.prospect_name ??
      (proposal.client_id ? "Client" : "Prospect");

    const buffer = await generateProposalDocx({
      orgName,
      recipientName,
      content: proposal.content,
    });

    await incrementUsage("export");

    const slug = recipientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const filename = `proposal-${slug}.docx`;

    return {
      success: true,
      data: { base64: buffer.toString("base64"), filename },
    };
  } catch {
    return { success: false, error: "Failed to generate document" };
  }
}
