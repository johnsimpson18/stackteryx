/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Shared system prompt ────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are the AI engine inside Stackteryx, a platform that helps Managed Service Providers (MSPs) package, price, and sell security services. You have deep expertise in MSP operations, cybersecurity service delivery, pricing strategy, and B2B sales enablement.

Rules:
- Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.
- Use the provided context (organization profile, service data, client data) to ground every answer.
- Never invent tool IDs, bundle IDs, or client IDs — only reference IDs present in the context.
- When generating text content (proposals, enablement, outcome statements), write in a professional, confident tone appropriate for B2B sales.
- Keep output concise and actionable.`;

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
  return `Given this organization and service context:

Organization:
${JSON.stringify(params.org_context, null, 2)}

Service:
${JSON.stringify(params.service_context, null, 2)}

Generate comprehensive sales enablement content for this service. Write in a professional B2B tone.

Return JSON with ALL of these fields:
{
  "service_overview": "string — 2-3 paragraph overview of the service for sales teams",
  "whats_included": "string — bullet-point list of what the client gets (use \\n for line breaks, prefix each with -)",
  "talking_points": "string — 3-5 sales talking points, each as a quotable statement (use \\n for line breaks, prefix each with -)",
  "pricing_narrative": "string — 2-3 sentences explaining the pricing value story",
  "why_us": "string — 2-3 paragraphs on competitive differentiation",
  "elevator_pitch": "string — 30-second pitch for the service",
  "value_proposition": "string — clear statement of the unique value",
  "objection_responses": [
    { "objection": "string", "response": "string" }
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
  }>;
  org_context: any;
  client_context?: any;
}): string {
  return `Given this context:

Organization:
${JSON.stringify(params.org_context, null, 2)}

${params.client_context ? `Client:\n${JSON.stringify(params.client_context, null, 2)}\n` : ""}Recipient: ${params.recipient_name}
Mode: ${params.mode}
${params.prospect_industry ? `Industry: ${params.prospect_industry}` : ""}
${params.prospect_size ? `Company Size: ${params.prospect_size}` : ""}
${params.primary_concern ? `Primary Concern: ${params.primary_concern}` : ""}

Services to include:
${JSON.stringify(params.services, null, 2)}

Generate a professional proposal. For each service, create a detailed description that includes what it delivers and what's included.

Return JSON:
{
  "executive_summary": "string — 2-3 paragraph executive summary",
  "services_overview": [
    {
      "name": "string — service name",
      "what_it_delivers": "string — what this service delivers",
      "whats_included": "string — bullet list of included items"
    }
  ],
  "pricing_summary": [
    {
      "service_name": "string",
      "price": "string — formatted price with unit"
    }
  ],
  "why_us": "string — 2-3 paragraphs on why choose this MSP",
  "risk_snapshot": ["string — each item is a risk mitigation point"]
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
