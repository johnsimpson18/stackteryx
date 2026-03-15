"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { upsertEnablement, getEnablementByVersionId } from "@/lib/db/enablement";
import { getCurrentProfile } from "@/lib/db/profiles";
import { requireOrgMembership } from "@/lib/org-context";
import { getOrgSettings } from "@/lib/db/org-settings";
import { createClient } from "@/lib/supabase/server";
import {
  generateEnablementPdf,
  generateEnablementDocx,
} from "@/lib/enablement-export";
import type { ActionResult } from "@/lib/types";

const enablementSchema = z.object({
  bundle_version_id: z.string().uuid(),
  service_overview: z.string().optional().default(""),
  whats_included: z.string().optional().default(""),
  talking_points: z.string().optional().default(""),
  pricing_narrative: z.string().optional().default(""),
  why_us: z.string().optional().default(""),
});

export async function saveEnablementAction(
  formData: unknown
): Promise<ActionResult<void>> {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { success: false, error: "Not authenticated" };

    const { orgId } = await requireOrgMembership();

    const parsed = enablementSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
      };
    }

    // Verify the bundle version belongs to this org
    const supabase = await createClient();
    const { data: version, error: versionError } = await supabase
      .from("bundle_versions")
      .select("bundle_id")
      .eq("id", parsed.data.bundle_version_id)
      .single();

    if (versionError || !version) {
      return { success: false, error: "Version not found" };
    }

    const { data: bundle, error: bundleError } = await supabase
      .from("bundles")
      .select("org_id")
      .eq("id", version.bundle_id)
      .single();

    if (bundleError || !bundle || bundle.org_id !== orgId) {
      return { success: false, error: "Not authorized" };
    }

    const { bundle_version_id, ...content } = parsed.data;

    await upsertEnablement(orgId, profile.id, bundle_version_id, content);

    // Revalidate the version detail page
    revalidatePath(`/services`);
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to save enablement content" };
  }
}

// ── Shared helper: resolve enablement + bundle + org context ────────────────

type ExportDataResult =
  | { ok: false; error: string }
  | { ok: true; orgName: string; bundleName: string; content: import("@/lib/types").EnablementContent };

async function resolveExportData(
  bundleVersionId: string
): Promise<ExportDataResult> {
  const { orgId } = await requireOrgMembership();

  const enablement = await getEnablementByVersionId(orgId, bundleVersionId);
  if (!enablement) {
    return { ok: false, error: "No enablement content found" };
  }

  const supabase = await createClient();

  const { data: version } = await supabase
    .from("bundle_versions")
    .select("bundle_id")
    .eq("id", bundleVersionId)
    .single();

  if (!version) {
    return { ok: false, error: "Version not found" };
  }

  const { data: bundle } = await supabase
    .from("bundles")
    .select("name, org_id")
    .eq("id", version.bundle_id)
    .single();

  if (!bundle || bundle.org_id !== orgId) {
    return { ok: false, error: "Not authorized" };
  }

  const settings = await getOrgSettings(orgId);
  const orgName = settings?.workspace_name ?? "Our MSP";

  return {
    ok: true,
    orgName,
    bundleName: bundle.name,
    content: {
      service_overview: enablement.service_overview ?? "",
      whats_included: enablement.whats_included ?? "",
      talking_points: enablement.talking_points ?? "",
      pricing_narrative: enablement.pricing_narrative ?? "",
      why_us: enablement.why_us ?? "",
    },
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Export PDF ───────────────────────────────────────────────────────────────

export async function exportEnablementPdfAction(
  bundleVersionId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const data = await resolveExportData(bundleVersionId);
    if (!data.ok) {
      return { success: false, error: data.error };
    }

    const buffer = await generateEnablementPdf(data);
    const filename = `${slugify(data.bundleName)}-enablement.pdf`;

    return {
      success: true,
      data: { base64: buffer.toString("base64"), filename },
    };
  } catch {
    return { success: false, error: "Failed to generate PDF" };
  }
}

// ── Export DOCX ──────────────────────────────────────────────────────────────

export async function exportEnablementDocxAction(
  bundleVersionId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    const data = await resolveExportData(bundleVersionId);
    if (!data.ok) {
      return { success: false, error: data.error };
    }

    const buffer = await generateEnablementDocx(data);
    const filename = `${slugify(data.bundleName)}-enablement.docx`;

    return {
      success: true,
      data: { base64: buffer.toString("base64"), filename },
    };
  } catch {
    return { success: false, error: "Failed to generate document" };
  }
}
