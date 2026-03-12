/* eslint-disable @typescript-eslint/no-explicit-any */

import { LANGUAGE_SAFETY_RULES } from "@/lib/ai/language-rules";

// ── Shared system prompt (used by non-sales-content routes: suggest pricing, match services, etc.) ──

export const SYSTEM_PROMPT = `You are the AI engine inside Stackteryx, a platform that helps Managed Service Providers (MSPs) package, price, and sell security services. You have deep expertise in MSP operations, cybersecurity service delivery, pricing strategy, and B2B sales enablement.

Rules:
- Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.
- Use the provided context (organization profile, service data, client data) to ground every answer.
- Never invent tool IDs, bundle IDs, or client IDs — only reference IDs present in the context.
- When generating text content (proposals, enablement, outcome statements), write in a professional, confident tone appropriate for B2B sales.
- Keep output concise and actionable.`;

// ── Proposal system prompt ──────────────────────────────────────────────────

export const PROPOSAL_SYSTEM_PROMPT = `You are a proposal writer for managed security service providers (MSSPs). You write compelling, honest client proposals that win business without overpromising.

You have deep expertise in MSP operations, cybersecurity service delivery, and B2B sales. You understand that MSP proposals that overstate capabilities destroy trust when they reach delivery.

${LANGUAGE_SAFETY_RULES}

PROPOSAL-SPECIFIC RULES:
- The executive summary must open with the client's specific situation or industry context — never a generic "in today's threat landscape" opener
- Each service in services_overview must describe what the service actually delivers (from the outcome_statement and capabilities) — not what security services generally do
- The pricing_summary must explain value in outcome terms, not feature terms — tie price to business results
- The why_us section must be specific to the MSP's actual service model (from org_context) — no generic "experienced team of experts" language
- The risk_snapshot must reflect realistic risks relevant to the client's industry — not a list of every possible cyber threat
- If a service has no outcome_statement in the context, describe it by its name and capabilities only — do not invent an outcome

Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.`;

// ── Enablement system prompt ────────────────────────────────────────────────

export const ENABLEMENT_SYSTEM_PROMPT = `You are a sales enablement writer for a managed security services provider. You write clear, confident, non-technical content that helps sales reps explain and sell security services to business decision-makers.

${LANGUAGE_SAFETY_RULES}

ENABLEMENT-SPECIFIC RULES:
- Write as if you are coaching a sales rep — practical, usable language they will actually say
- Never include internal pricing, cost structures, or margin data in any customer-facing output
- The service overview must lead with the business problem solved, not the technology used
- Talking points must be specific to the capabilities listed — not generic MSSP talking points
- Objection responses must be honest — do not dismiss legitimate buyer concerns, address them directly
- Email templates must feel human — not like marketing automation

Return ONLY valid JSON. No markdown, no code fences.`;

// ── Function 1: Draft Outcome ───────────────────────────────────────────────

export function draftOutcomePrompt(params: {
  name?: string;
  outcome_type?: string;
  org_context: any;
}): string {
  return `Given this organization context:
${JSON.stringify(params.org_context, null, 2)}

Draft a service outcome for a ${params.outcome_type || "security"} service${params.name ? ` called "${params.name}"` : ""}.

The outcome statement should:
- Be 1-2 sentences describing the measurable business result the service delivers
- Focus on risk reduction, compliance, or operational improvement
- Reference the target market from the org profile

Return JSON:
{
  "outcome_statement": "string — the outcome statement",
  "target_vertical": "string — the target industry vertical",
  "target_persona": "string — the buyer persona (e.g. IT Director, vCISO)"
}`;
}

// ── Function 2: Recommend Capabilities ──────────────────────────────────────

export function recommendCapabilitiesPrompt(params: {
  bundle_type?: string;
  outcome_type?: string;
  outcome_statement?: string;
  service_name?: string;
  org_context: any;
}): string {
  return `Given this organization context:
${JSON.stringify(params.org_context, null, 2)}

Suggest 4-6 service capabilities for a ${params.bundle_type || "managed_service"} bundle${params.service_name ? ` called "${params.service_name}"` : ""}${params.outcome_type ? ` focused on ${params.outcome_type}` : ""}${params.outcome_statement ? ` with outcome: "${params.outcome_statement}"` : ""}.

Each capability should be a concrete, deliverable component of the service (e.g. "24/7 Threat Monitoring", "Incident Response", "Vulnerability Management").

Return JSON:
{
  "capabilities": [
    { "name": "string", "description": "string — 1-2 sentence description of what this capability delivers" }
  ]
}`;
}

// ── Function 3: Suggest Pricing ─────────────────────────────────────────────

export function suggestPricingPrompt(params: {
  service_context: any;
  org_context: any;
}): string {
  return `Given this organization and service context:

Organization:
${JSON.stringify(params.org_context, null, 2)}

Service:
${JSON.stringify(params.service_context, null, 2)}

Suggest a competitive price for this managed service. Consider:
- The tool costs and true cost floor
- Industry-standard margins for MSPs (typically 30-50%)
- The value delivered by the outcome statement
- Market positioning of the service

Return JSON:
{
  "suggested_price": number,
  "margin_pct": number,
  "billing_unit": "string — e.g. per seat/month, per endpoint/month, flat monthly",
  "cost_floor": number,
  "pricing_rationale": "string — 2-3 sentences explaining the pricing recommendation"
}`;
}

// ── Function 4: Generate Enablement ─────────────────────────────────────────

export function generateEnablementPrompt(params: {
  service_context: any;
  org_context: any;
}): string {
  const service = params.service_context;
  const tools = service?.versions?.[0]?.tools ?? [];
  const toolDomains = Array.from(new Set(tools.map((t: any) => String(t.tool_name || t.category)).filter(Boolean))) as string[];
  const capabilities = Array.isArray(service?.service_capabilities)
    ? service.service_capabilities.map((c: any) => `- ${c.name}: ${c.description}`)
    : [];

  return `Generate sales enablement content for the managed security service described below.

SERVICE:
  Name: ${service?.bundle_name || "Not specified"}
  Outcome type: ${service?.outcome_type || "Not specified"}
  Outcome statement: ${service?.outcome_statement || "NOT PROVIDED — do not invent an outcome"}
  Target vertical: ${service?.target_vertical || "General"}
  Target persona: ${service?.target_persona || "Business Decision Maker"}

CAPABILITIES THIS SERVICE DELIVERS:
${capabilities.length > 0 ? capabilities.join("\n") : "NOT PROVIDED — only reference capabilities if listed above"}

TECHNOLOGY DOMAINS IN THIS SERVICE'S STACK:
${toolDomains.length > 0 ? toolDomains.map((d: string) => `- ${d}`).join("\n") : "NOT PROVIDED — do not reference specific technology categories"}

MSP CONTEXT:
  Organization: ${params.org_context?.org_name || ""}
  Target verticals: ${params.org_context?.target_verticals?.join(", ") || "General"}

GROUNDING INSTRUCTION: Every section of your output must be traceable to the service data above. Do not add capabilities, outcomes, or technology references not present in the data. If a field is not provided, omit references to it.

Return JSON with ALL of these fields:
{
  "service_overview": "string — 2-3 paragraph overview, business language, outcome-led",
  "whats_included": "string — bullet-point list of what the client receives, based on capabilities above (use \\n for line breaks, prefix each with -)",
  "talking_points": "string — 4-6 specific, grounded talking points for sales reps (use \\n for line breaks, prefix each with -)",
  "pricing_narrative": "string — 2-3 sentences on how to position and justify the price, no internal cost figures",
  "why_us": "string — 2-3 paragraphs specific to this MSP's delivery model",
  "elevator_pitch": "string — 30-second pitch anchored to the outcome statement",
  "value_proposition": "string — clear statement of the unique value",
  "objection_responses": [
    { "objection": "string", "response": "string — honest, direct response" }
  ],
  "discovery_questions": ["string — question a sales rep should ask prospects"]
}`;
}

// ── Function 5: Generate Proposal ───────────────────────────────────────────

export function generateProposalPrompt(params: {
  mode: "client" | "prospect";
  recipient_name: string;
  prospect_industry?: string;
  prospect_size?: string;
  primary_concern?: string;
  services: Array<{
    service_name: string;
    outcome_type?: string;
    outcome_statement?: string;
    service_capabilities?: Array<{ name: string; description: string }>;
    suggested_price?: number;
    billing_unit?: string;
    additional_services?: Array<{
      name: string;
      category: string;
      description: string | null;
      sell_price: number;
    }>;
  }>;
  org_context: any;
  client_context?: any;
}): string {
  const serviceBlocks = params.services
    .map((s) => {
      const caps = Array.isArray(s.service_capabilities) && s.service_capabilities.length > 0
        ? s.service_capabilities.map((c) => c.name).join(", ")
        : "Not specified";
      const addOns = Array.isArray(s.additional_services) && s.additional_services.length > 0
        ? s.additional_services.map((a) => `${a.name} (${a.category})`).join(", ")
        : null;
      return `SERVICE: ${s.service_name}
  Outcome: ${s.outcome_statement || "Not specified"}
  Capabilities: ${caps}
  Price: ${s.suggested_price ? `${s.suggested_price} ${s.billing_unit || ""}` : "To be discussed"}${addOns ? `\n  Add-on services: ${addOns}` : ""}`;
    })
    .join("\n---\n");

  return `Generate a client proposal for the managed security services described below.

RECIPIENT:
  Company: ${params.recipient_name || "Prospect"}
  Industry: ${params.prospect_industry || "Not specified"}
  Company size: ${params.prospect_size || "Not specified"}
  Primary concern: ${params.primary_concern || "Not specified"}
  Mode: ${params.mode}

${params.client_context ? `CLIENT CONTEXT:\n${JSON.stringify(params.client_context, null, 2)}\n` : ""}MSP ORGANIZATION:
${JSON.stringify(params.org_context, null, 2)}

SERVICES INCLUDED IN THIS PROPOSAL:
${serviceBlocks}

GROUNDING INSTRUCTION: Base every claim in this proposal on the service data above. The services_overview section must describe each service using its actual outcome statement and capabilities — not generic descriptions of what that type of service typically does. If a field says "Not specified", omit that element rather than inventing it.

Return JSON:
{
  "executive_summary": "string — 2-3 paragraph executive summary opening with the client's situation",
  "services_overview": [
    {
      "name": "string — service name",
      "what_it_delivers": "string — based on the service's actual outcome and capabilities",
      "whats_included": "string — bullet list of included items based on capabilities"
    }
  ],
  "pricing_summary": [
    {
      "service_name": "string",
      "price": "string — formatted price with unit, framed in value terms"
    }
  ],
  "why_us": "string — 2-3 paragraphs specific to this MSP's delivery model",
  "risk_snapshot": ["string — realistic risks relevant to the client's industry"]
}`;
}

// ── Function 6: Match Services ──────────────────────────────────────────────

export function matchServicesPrompt(params: {
  prospect_industry?: string;
  prospect_size?: string;
  primary_concern?: string;
  org_context: any;
  portfolio_context: any;
}): string {
  return `Given this organization and portfolio context:

Organization:
${JSON.stringify(params.org_context, null, 2)}

Available Services Portfolio:
${JSON.stringify(params.portfolio_context, null, 2)}

A prospect has the following profile:
- Industry: ${params.prospect_industry || "Not specified"}
- Company Size: ${params.prospect_size || "Not specified"}
- Primary Concern: ${params.primary_concern || "General security"}

Match the most relevant services from the portfolio to this prospect. Only use bundle_ids that exist in the portfolio context.

Return JSON:
{
  "matched_services": [
    {
      "bundle_id": "string — must be an actual bundle ID from the portfolio",
      "service_name": "string — the bundle name",
      "match_reason": "string — 1-2 sentences explaining why this service matches the prospect"
    }
  ]
}`;
}

// ── Recommend Stack ─────────────────────────────────────────────────────────

export function recommendStackPrompt(params: {
  available_tools: any[];
  outcome_type?: string;
  outcome_statement?: string;
  service_name?: string;
  org_context: any;
}): string {
  return `Given this organization context:
${JSON.stringify(params.org_context, null, 2)}

And this available tool catalog:
${JSON.stringify(params.available_tools, null, 2)}

${params.service_name ? `For a service called "${params.service_name}"` : "For this service"}${params.outcome_type ? ` focused on ${params.outcome_type}` : ""}${params.outcome_statement ? ` with outcome: "${params.outcome_statement}"` : ""}, recommend the best combination of tools from the catalog.

Select tools that:
- Cover the core security capabilities needed
- Work well together as an integrated stack
- Provide good cost efficiency
- Match the service's outcome goals

Only use tool IDs from the provided catalog.

Return JSON:
{
  "recommended_tool_ids": ["string — tool IDs from the catalog"]
}`;
}

// ── Analyze Margin Impact (internal trigger) ────────────────────────────────

export function analyzeMarginImpactPrompt(params: {
  change_description: string;
  affected_services: any[];
  org_context: any;
}): string {
  return `Given this organization context:
${JSON.stringify(params.org_context, null, 2)}

A cost change has occurred: ${params.change_description}

Affected services:
${JSON.stringify(params.affected_services, null, 2)}

Analyze the margin impact of this change on each affected service.

Return JSON:
{
  "impact_summary": "string — 2-3 sentence summary of the overall margin impact and recommended actions"
}`;
}
