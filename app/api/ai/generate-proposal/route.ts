import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { generateProposalPrompt, PROPOSAL_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { getPlaybookByBundleId } from "@/lib/db/enablement";
import { getAdditionalServicesByVersionId } from "@/lib/db/additional-services";
import { getBundleById } from "@/lib/db/bundles";
import { getServiceOutcome } from "@/lib/db/service-outcomes";
import { validateProposalContext } from "@/lib/ai/validate-context";
import {
  COMPLIANCE_LANGUAGE_OVERRIDE,
  isComplianceFocused,
} from "@/lib/ai/language-rules";

export const maxDuration = 60;

/**
 * Extract relevant playbook intelligence for a service to inject into the proposal prompt.
 */
function extractPlaybookContext(
  serviceName: string,
  playbookContent: Record<string, unknown>
): string | null {
  const talkTrack = playbookContent.talk_track as
    | { proof_points?: string[] }
    | undefined;
  const cheatSheet = playbookContent.cheat_sheet as
    | { differentiators?: string[] }
    | undefined;
  const icp = playbookContent.icp as
    | { buying_triggers?: string[] }
    | undefined;
  const objections = playbookContent.objections as
    | Array<{ objection?: string; response?: string }>
    | undefined;

  const proofPoints = talkTrack?.proof_points ?? [];
  const differentiators = cheatSheet?.differentiators ?? [];
  const buyingTriggers = icp?.buying_triggers ?? [];
  const objectionList = (objections ?? [])
    .filter((o) => o.objection && o.response)
    .map((o) => `"${o.objection}" → ${o.response}`)
    .slice(0, 4);

  // Only include if we have at least some data
  if (
    proofPoints.length === 0 &&
    differentiators.length === 0 &&
    buyingTriggers.length === 0 &&
    objectionList.length === 0
  ) {
    return null;
  }

  const parts: string[] = [`Service: ${serviceName}`];
  if (proofPoints.length > 0)
    parts.push(`- Proof points: ${proofPoints.join("; ")}`);
  if (differentiators.length > 0)
    parts.push(`- Differentiators: ${differentiators.join("; ")}`);
  if (buyingTriggers.length > 0)
    parts.push(
      `- Buying triggers relevant to this client: ${buyingTriggers.join("; ")}`
    );
  if (objectionList.length > 0)
    parts.push(
      `- Known objections to address preemptively: ${objectionList.join("; ")}`
    );

  return parts.join("\n");
}

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
      outcome_type?: string;
      outcome_statement?: string;
      service_capabilities?: Array<{ name: string; description: string }>;
      suggested_price?: number;
      billing_unit?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipientName =
    body.mode === "client" ? "your client" : body.prospect_name || "the prospect";

  try {
    // Server-side verification: fetch real service data instead of trusting client
    const uniqueBundleIds = [
      ...new Set(body.services.map((s) => s.bundle_id)),
    ];

    const [bundleResults, outcomeResults] = await Promise.all([
      Promise.all(uniqueBundleIds.map((id) => getBundleById(id))),
      Promise.all(uniqueBundleIds.map((id) => getServiceOutcome(id))),
    ]);

    const bundleMap = new Map(
      bundleResults
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map((b) => [b.id, b])
    );
    const outcomeMap = new Map(
      outcomeResults
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => [o.bundle_id, o])
    );

    // Verify all bundles belong to this org
    for (const bundleId of uniqueBundleIds) {
      const bundle = bundleMap.get(bundleId);
      if (!bundle || bundle.org_id !== orgId) {
        return Response.json(
          { error: "Service not found or unauthorized" },
          { status: 403 }
        );
      }
    }

    // Enrich services with server-fetched data
    const verifiedServices = body.services.map((s) => {
      const bundle = bundleMap.get(s.bundle_id);
      const outcome = outcomeMap.get(s.bundle_id);
      return {
        ...s,
        service_name: bundle?.name ?? s.service_name,
        outcome_type: outcome?.outcome_type ?? undefined,
        outcome_statement: outcome?.outcome_statement ?? undefined,
        service_capabilities: outcome?.service_capabilities ?? undefined,
      };
    });

    const context = await buildAIContext({
      orgId,
      clientId: body.client_id,
    });

    // Validation gate
    const validation = validateProposalContext(
      context,
      verifiedServices.length
    );
    if (!validation.valid) {
      return Response.json(
        { error: "Insufficient context", missing: validation.missing },
        { status: 422 }
      );
    }

    // ── Fetch additional services + playbook context ──────────────────
    const playbookContextParts: string[] = [];

    const [playbookResults, addSvcResults] = await Promise.all([
      Promise.allSettled(
        verifiedServices.map((s) => getPlaybookByBundleId(orgId, s.bundle_id))
      ),
      Promise.allSettled(
        verifiedServices.map((s) =>
          s.pricing_version_id
            ? getAdditionalServicesByVersionId(s.pricing_version_id)
            : Promise.resolve([])
        )
      ),
    ]);

    for (let i = 0; i < verifiedServices.length; i++) {
      const result = playbookResults[i];
      if (
        result.status === "fulfilled" &&
        result.value?.playbook_content
      ) {
        const extracted = extractPlaybookContext(
          verifiedServices[i].service_name,
          result.value.playbook_content
        );
        if (extracted) {
          playbookContextParts.push(extracted);
        }
      }
    }

    // Build the base prompt — include additional services in each service's context
    let userPrompt = generateProposalPrompt({
      mode: body.mode,
      recipient_name: recipientName,
      prospect_industry: body.prospect_industry,
      prospect_size: body.prospect_size,
      primary_concern: body.primary_concern,
      services: verifiedServices.map((s, i) => {
        const addSvcResult = addSvcResults[i];
        const addSvcs =
          addSvcResult.status === "fulfilled" && addSvcResult.value.length > 0
            ? addSvcResult.value.map((as) => ({
                name: as.additional_service.name,
                category: as.additional_service.category,
                description: as.additional_service.description,
                sell_price: as.effective_sell_price,
              }))
            : undefined;

        return {
          service_name: s.service_name,
          outcome_type: s.outcome_type,
          outcome_statement: s.outcome_statement,
          service_capabilities: s.service_capabilities,
          suggested_price: s.suggested_price,
          billing_unit: s.billing_unit,
          ...(addSvcs ? { additional_services: addSvcs } : {}),
        };
      }),
      org_context: context.org_context,
      client_context: context.client_context,
    });

    // ── Inject playbook intelligence if available ─────────────────────
    if (playbookContextParts.length > 0) {
      userPrompt += `

Sales playbook intelligence is available for the following services. Use this context to strengthen the proposal — do not copy it verbatim, use it to inform the tone, substance, and specificity of the output.

${playbookContextParts.join("\n\n")}

Apply this intelligence as follows:
- Use proof points and differentiators to strengthen the Services Overview and Why Us sections
- Use buying triggers to personalize the Executive Summary to this client's specific situation
- Use objections to inform the Risk Snapshot — address the most relevant ones preemptively`;
    }

    // ── Append compliance guardrail if any service is compliance-focused ──
    const hasComplianceService = verifiedServices.some((s) =>
      isComplianceFocused(s.outcome_type, s.outcome_statement)
    );
    if (hasComplianceService) {
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
      systemPrompt: PROPOSAL_SYSTEM_PROMPT,
    });

    // Transform structured AI output into flat ProposalContent shape
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
