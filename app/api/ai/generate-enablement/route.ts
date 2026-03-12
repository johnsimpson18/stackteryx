import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { generateEnablementPrompt, ENABLEMENT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import {
  getVersionsByBundleId,
  getVersionById,
} from "@/lib/db/bundle-versions";
import { validateEnablementContext } from "@/lib/ai/validate-context";
import {
  COMPLIANCE_LANGUAGE_OVERRIDE,
  isComplianceFocused,
} from "@/lib/ai/language-rules";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { ToolCategory } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrgId();
  if (!orgId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getOrgMembership(orgId);
  if (!membership)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { bundle_id?: string; bundle_version_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body is fine
  }

  try {
    // Resolve bundle_id from bundle_version_id if needed
    let bundleId = body.bundle_id;
    let versionId = body.bundle_version_id;

    if (!bundleId && versionId) {
      const version = await getVersionById(versionId);
      if (version) {
        bundleId = version.bundle_id;
      }
    }

    const context = await buildAIContext({
      orgId,
      bundleId,
    });

    // Belt-and-suspenders: ensure tools are present for the target version
    if (bundleId && context.service_context) {
      const resolvedVersionId = versionId;
      let targetVersionId = resolvedVersionId;

      if (!targetVersionId) {
        const versions = await getVersionsByBundleId(bundleId);
        if (versions.length > 0) {
          targetVersionId = versions[0].id;
        }
      }

      if (targetVersionId) {
        const contextHasTools = (context.service_context.versions ?? []).some(
          (v) => (v.tools?.length ?? 0) > 0
        );

        if (!contextHasTools) {
          const fullVersion = await getVersionById(targetVersionId);
          if (fullVersion?.tools && fullVersion.tools.length > 0) {
            const extraTools = fullVersion.tools
              .filter((vt) => vt.tool)
              .map((vt) => ({
                tool_id: vt.tool_id,
                tool_name: vt.tool!.name,
                category:
                  CATEGORY_LABELS[vt.tool!.category as ToolCategory] ??
                  vt.tool!.category,
              }));

            if (
              context.service_context.versions &&
              context.service_context.versions.length > 0
            ) {
              context.service_context.versions[0].tools = extraTools;
            } else {
              context.service_context.versions = [
                {
                  version_number: fullVersion.version_number,
                  seat_count: fullVersion.seat_count,
                  computed_suggested_price: fullVersion.computed_suggested_price,
                  computed_true_cost_per_seat:
                    fullVersion.computed_true_cost_per_seat,
                  computed_margin_post_discount:
                    fullVersion.computed_margin_post_discount,
                  tools: extraTools,
                },
              ];
            }
          }
        }
      }
    }

    // Validation gate
    const validation = validateEnablementContext(context);
    if (!validation.valid) {
      return Response.json(
        { error: "Insufficient context", missing: validation.missing },
        { status: 422 }
      );
    }

    let userPrompt = generateEnablementPrompt({
      service_context: context.service_context ?? {},
      org_context: context.org_context,
    });

    // Append compliance guardrail if service is compliance-focused
    if (
      isComplianceFocused(
        context.service_context?.outcome_type,
        context.service_context?.outcome_statement
      )
    ) {
      userPrompt += COMPLIANCE_LANGUAGE_OVERRIDE;
    }

    const result = await callAI<{
      service_overview: string;
      whats_included: string;
      talking_points: string;
      pricing_narrative: string;
      why_us: string;
      elevator_pitch?: string;
      value_proposition?: string;
      objection_responses?: Array<{ objection: string; response: string }>;
      discovery_questions?: string[];
    }>({
      userPrompt,
      requiredFields: [
        "service_overview",
        "whats_included",
        "talking_points",
        "pricing_narrative",
        "why_us",
      ],
      temperature: 0.7,
      systemPrompt: ENABLEMENT_SYSTEM_PROMPT,
    });

    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
