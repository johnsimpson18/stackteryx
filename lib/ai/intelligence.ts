import { createClient } from "@/lib/supabase/server";
import { getAllServiceCompleteness } from "@/lib/db/service-completeness";
import { getProposals } from "@/lib/db/proposals";
import { getClients } from "@/lib/db/clients";
import { buildAIContext } from "@/lib/ai/context";
import { callAI } from "@/lib/ai/validate";
import { analyzeMarginImpactPrompt } from "@/lib/ai/prompts";
import type { ActionCardSeverity, ActionCardType, ActionCardEntityType } from "@/lib/types";

// ── Upsert helper ───────────────────────────────────────────────────────────

export async function upsertActionCard(
  orgId: string,
  cardType: ActionCardType,
  entityId: string,
  data: {
    severity: ActionCardSeverity;
    title: string;
    body: string;
    cta_label?: string;
    cta_href?: string;
    entity_type?: ActionCardEntityType;
    expires_at?: string;
  }
): Promise<void> {
  const supabase = await createClient();

  // Check for existing active card with same card_type + entity_id
  const { data: existing } = await supabase
    .from("ai_action_cards")
    .select("id")
    .eq("org_id", orgId)
    .eq("card_type", cardType)
    .eq("entity_id", entityId)
    .is("dismissed_at", null)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Update existing card
    await supabase
      .from("ai_action_cards")
      .update({
        severity: data.severity,
        title: data.title,
        body: data.body,
        cta_label: data.cta_label ?? null,
        cta_href: data.cta_href ?? null,
        expires_at: data.expires_at ?? null,
      })
      .eq("id", existing.id);
  } else {
    // Insert new card
    await supabase.from("ai_action_cards").insert({
      org_id: orgId,
      card_type: cardType,
      severity: data.severity,
      title: data.title,
      body: data.body,
      cta_label: data.cta_label ?? null,
      cta_href: data.cta_href ?? null,
      entity_type: data.entity_type ?? null,
      entity_id: entityId,
      expires_at: data.expires_at ?? null,
    });
  }
}

// ── Trigger 1: Service Incompleteness ───────────────────────────────────────

export async function checkServiceIncompleteness(
  orgId: string,
  bundleId: string
): Promise<void> {
  const completeness = await getAllServiceCompleteness(orgId);
  const service = completeness.find((s) => s.bundle_id === bundleId);

  if (service && service.layers_complete < 5) {
    const missingLayers: string[] = [];
    if (!service.outcome_complete) missingLayers.push("Outcome");
    if (!service.service_complete) missingLayers.push("Service");
    if (!service.stack_complete) missingLayers.push("Stack");
    if (!service.economics_complete) missingLayers.push("Economics");
    if (!service.enablement_complete) missingLayers.push("Enablement");

    await upsertActionCard(orgId, "incomplete_service", bundleId, {
      severity: service.layers_complete <= 2 ? "critical" : "warning",
      title: `${service.service_name} is incomplete`,
      body: `${service.layers_complete}/5 layers complete. Missing: ${missingLayers.join(", ")}. Complete all layers to activate this service.`,
      cta_label: "Complete Service",
      cta_href: `/services/${bundleId}`,
      entity_type: "service",
    });
  }
}

// ── Trigger 2: Margin Impact ────────────────────────────────────────────────

export async function checkMarginImpact(
  orgId: string,
  params: {
    change_description: string;
    affected_services: Array<{
      bundle_id: string;
      service_name: string;
      current_margin_pct: number;
    }>;
  }
): Promise<void> {
  if (params.affected_services.length === 0) return;

  try {
    const context = await buildAIContext({ orgId });

    const result = await callAI<{ impact_summary: string }>({
      userPrompt: analyzeMarginImpactPrompt({
        change_description: params.change_description,
        affected_services: params.affected_services,
        org_context: context.org_context,
      }),
      requiredFields: ["impact_summary"],
      temperature: 0.4,
    });

    for (const service of params.affected_services) {
      await upsertActionCard(orgId, "margin_risk", service.bundle_id, {
        severity:
          service.current_margin_pct < 0.15 ? "critical" : "warning",
        title: `Margin impact on ${service.service_name}`,
        body: result.impact_summary,
        cta_label: "Review Pricing",
        cta_href: `/services/${service.bundle_id}/economics`,
        entity_type: "service",
      });
    }
  } catch {
    // Silently fail — intelligence triggers should not break operations
  }
}

// ── Trigger 3: Renewal Alerts ───────────────────────────────────────────────

export async function checkRenewalAlerts(orgId: string): Promise<number> {
  const clients = await getClients(orgId);
  let cardsCreated = 0;

  const sixtyDaysFromNow = new Date();
  sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

  for (const client of clients) {
    if (!client.active_contract) continue;
    const endDate = new Date(client.active_contract.end_date);

    if (endDate <= sixtyDaysFromNow && client.active_contract.status === "active") {
      const daysUntil = Math.ceil(
        (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await upsertActionCard(orgId, "renewal_alert", client.id, {
        severity: daysUntil <= 14 ? "critical" : "warning",
        title: `${client.name} contract renews in ${daysUntil} days`,
        body: `The contract for ${client.active_contract.bundle_name} (${client.active_contract.seat_count} seats, $${client.active_contract.monthly_revenue.toFixed(0)}/mo) expires on ${client.active_contract.end_date}. Schedule a renewal conversation.`,
        cta_label: "View Client",
        cta_href: `/clients/${client.id}`,
        entity_type: "client",
        expires_at: new Date(
          endDate.getTime() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
      cardsCreated++;
    }
  }

  return cardsCreated;
}

// ── Trigger 4: Stale Proposals ──────────────────────────────────────────────

export async function checkStaleProposals(orgId: string): Promise<number> {
  const proposals = await getProposals(orgId);
  let cardsCreated = 0;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  for (const proposal of proposals) {
    if (proposal.status !== "draft") continue;

    const updatedAt = new Date(proposal.updated_at);
    if (updatedAt < fourteenDaysAgo) {
      const daysStale = Math.ceil(
        (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const name =
        proposal.prospect_name ?? proposal.client_id ?? "Unknown";

      await upsertActionCard(orgId, "stale_proposal", proposal.id, {
        severity: "info",
        title: `Draft proposal for ${name} is ${daysStale} days old`,
        body: `This proposal has been in draft status since ${proposal.updated_at.slice(0, 10)}. Consider finalizing, sending, or archiving it.`,
        cta_label: "View Proposal",
        cta_href: `/proposals/${proposal.id}`,
        entity_type: "proposal",
      });
      cardsCreated++;
    }
  }

  return cardsCreated;
}

// ── Daily Intelligence Runner ───────────────────────────────────────────────

export async function runDailyIntelligence(
  orgId: string
): Promise<{ renewals: number; stale_proposals: number }> {
  const [renewals, staleProposals] = await Promise.all([
    checkRenewalAlerts(orgId),
    checkStaleProposals(orgId),
  ]);

  return { renewals, stale_proposals: staleProposals };
}
