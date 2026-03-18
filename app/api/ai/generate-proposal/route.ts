import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { buildSalesStudioContext } from "@/lib/ai/sales-studio-context";
import { callAI } from "@/lib/ai/validate";
import {
  buildClientProposalPrompt,
  buildProspectProposalPrompt,
  CLIENT_PROPOSAL_SYSTEM_PROMPT,
  PROSPECT_PROPOSAL_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/sales-studio-prompts";
import { getPlaybookByBundleId } from "@/lib/db/enablement";
import { getBundleById } from "@/lib/db/bundles";
import { validateProposalContext } from "@/lib/ai/validate-context";
import {
  COMPLIANCE_LANGUAGE_OVERRIDE,
  isComplianceFocused,
} from "@/lib/ai/language-rules";
import { checkLimit, incrementUsage } from "@/actions/billing";
import { logAgentActivity } from "@/lib/agents/log-activity";

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

  const aiLimit = await checkLimit("aiGenerationsPerMonth");
  if (!aiLimit.allowed) {
    return Response.json({ error: "LIMIT_REACHED" }, { status: 403 });
  }

  let body: {
    mode: "client" | "prospect";
    client_id?: string;
    prospect_name?: string;
    prospect_industry?: string;
    prospect_size?: string;
    primary_concern?: string;
    services: Array<{
      bundle_id: string;
      pricing_version_id: string;
      service_name: string;
      suggested_price?: number;
      billing_unit?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    // Verify all bundles belong to this org
    const uniqueBundleIds = [
      ...new Set(body.services.map((s) => s.bundle_id)),
    ];

    const bundleResults = await Promise.all(
      uniqueBundleIds.map((id) => getBundleById(id))
    );

    for (let i = 0; i < uniqueBundleIds.length; i++) {
      const bundle = bundleResults[i];
      if (!bundle || bundle.org_id !== orgId) {
        return Response.json(
          { error: "Service not found or unauthorized" },
          { status: 403 }
        );
      }
    }

    // Build org context (for MSP info)
    const orgAIContext = await buildAIContext({
      orgId,
      clientId: body.client_id,
    });

    // Validation gate
    const validation = validateProposalContext(
      orgAIContext,
      body.services.length
    );
    if (!validation.valid) {
      return Response.json(
        { error: "Insufficient context", missing: validation.missing },
        { status: 422 }
      );
    }

    // Build Sales Studio context for the primary service
    // Use the first service as the primary context source
    const primaryBundleId = body.services[0].bundle_id;
    const studioCtx = await buildSalesStudioContext(
      primaryBundleId,
      body.client_id
    );

    // Override pricing if provided
    const priceOverride = body.services[0]?.suggested_price;
    if (priceOverride && studioCtx.pricing) {
      studioCtx.pricing.monthlyTotal = priceOverride;
    } else if (priceOverride) {
      studioCtx.pricing = { monthlyTotal: priceOverride, tierName: null };
    }

    // Fetch playbook for enrichment
    let playbookContent: Record<string, unknown> | null = null;
    try {
      const pb = await getPlaybookByBundleId(orgId, primaryBundleId);
      if (pb?.playbook_content) {
        playbookContent = pb.playbook_content;
      }
    } catch {
      // Non-fatal
    }

    // Build the prompt based on mode
    let userPrompt: string;
    let systemPrompt: string;

    if (body.mode === "client") {
      systemPrompt = CLIENT_PROPOSAL_SYSTEM_PROMPT;
      userPrompt = buildClientProposalPrompt(
        studioCtx,
        orgAIContext.org_context as unknown as Record<string, unknown>,
        playbookContent
      );
    } else {
      systemPrompt = PROSPECT_PROPOSAL_SYSTEM_PROMPT;
      userPrompt = buildProspectProposalPrompt(
        studioCtx,
        orgAIContext.org_context as unknown as Record<string, unknown>,
        {
          name: body.prospect_name || "Prospect",
          industry: body.prospect_industry,
          size: body.prospect_size,
          primaryConcern: body.primary_concern,
        }
      );
    }

    // Append compliance guardrail if applicable
    const isCompliance = isComplianceFocused(
      studioCtx.outcomes[0]?.statement,
      studioCtx.complianceFrameworks.length > 0
        ? studioCtx.complianceFrameworks.join(", ")
        : undefined
    );
    if (isCompliance || studioCtx.complianceFrameworks.length > 0) {
      userPrompt += COMPLIANCE_LANGUAGE_OVERRIDE;
    }

    const aiResult = await callAI<{
      executive_summary: string;
      services_overview: Array<{
        name: string;
        what_it_delivers: string;
        whats_included: string;
      }>;
      pricing_summary: Array<{
        service_name: string;
        price: string;
      }>;
      why_us: string;
      risk_snapshot: string[];
    }>({
      userPrompt,
      requiredFields: [
        "executive_summary",
        "services_overview",
        "pricing_summary",
        "why_us",
        "risk_snapshot",
      ],
      temperature: 0.7,
      systemPrompt,
    });

    // Transform to flat ProposalContent shape
    const servicesOverview = aiResult.services_overview.map((s) => ({
      name: s.name,
      description: `${s.what_it_delivers}\n\nWhat's included:\n${s.whats_included}`,
    }));

    const pricingSummary = Array.isArray(aiResult.pricing_summary)
      ? aiResult.pricing_summary
          .map((p) => `${p.service_name}: ${p.price}`)
          .join("\n")
      : String(aiResult.pricing_summary);

    const riskSnapshot = Array.isArray(aiResult.risk_snapshot)
      ? aiResult.risk_snapshot.map((r) => `- ${r}`).join("\n")
      : String(aiResult.risk_snapshot);

    await incrementUsage("ai_generation");

    // Log Pitch activity (fire-and-forget)
    try {
      const targetName =
        body.mode === "client"
          ? studioCtx.client?.name || "a client"
          : body.prospect_name || "a prospect";
      logAgentActivity({
        orgId,
        agentId: "pitch",
        activityType: "generation",
        title: `Pitch wrote a ${body.mode} proposal for ${targetName}`,
        entityType: "proposal",
        entityId: body.client_id,
        entityName: targetName,
        metadata: { mode: body.mode, serviceCount: body.services.length },
      });
    } catch {
      /* never block */
    }

    return Response.json({
      executive_summary: aiResult.executive_summary,
      services_overview: servicesOverview,
      pricing_summary: pricingSummary,
      why_us: aiResult.why_us,
      risk_snapshot: riskSnapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
