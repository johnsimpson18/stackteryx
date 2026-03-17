// Rebuilt Sales Studio AI prompts — outcome-first, tool-aware.
// Client-facing prompts use toolsTranslated + outcomes ONLY.
// Playbook (MSP internal) may reference tool names parenthetically.

import { LANGUAGE_SAFETY_RULES } from "@/lib/ai/language-rules";
import type { SalesStudioContext } from "@/lib/ai/sales-studio-context";

// ── Vendor name prohibition (injected into all client-facing prompts) ────────

const VENDOR_NAME_PROHIBITION = `
CRITICAL RULES:
- Never mention vendor names, product names, or brand names in any client-facing content
- Never reference specific tools by their commercial name (e.g. CrowdStrike, Datto, Splunk, Microsoft, etc.)
- Always describe capabilities in terms of what they do for the client, not what the technology is called
- Lead every section with business outcomes, not features
- Write as if the client has no technical background — they care about risk reduction, business continuity, and cost, not technology architecture
`;

// ── Client Proposal ──────────────────────────────────────────────────────────

export const CLIENT_PROPOSAL_SYSTEM_PROMPT = `You are a proposal writer for managed security service providers (MSSPs). You write compelling, honest client proposals that win business without overpromising.

${VENDOR_NAME_PROHIBITION}

${LANGUAGE_SAFETY_RULES}

PROPOSAL-SPECIFIC RULES:
- The executive summary must open with the client's specific situation or industry context — never a generic "in today's threat landscape" opener
- Each service description must be driven by the OUTCOMES provided — describe what the client achieves, not what technologies are deployed
- Describe capabilities using the translated outcome language provided — never raw tool/vendor names
- The pricing_summary must explain value in outcome terms — tie price to business results
- The why_us section must be specific to the MSP's service model — no generic language
- The risk_snapshot must reflect realistic risks relevant to the client's industry
- Frame additional services as natural extensions of the core service value

Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.`;

export function buildClientProposalPrompt(
  ctx: SalesStudioContext,
  orgContext: Record<string, unknown>,
  playbook?: Record<string, unknown> | null
): string {
  const outcomesList = ctx.outcomes.length > 0
    ? ctx.outcomes.map((o) => `- ${o.statement}${o.description ? ` (${o.description})` : ""}`).join("\n")
    : "No specific outcomes defined — describe the service by its name and capabilities only";

  const capsList = ctx.capabilities.length > 0
    ? ctx.capabilities.map((c) => `- ${c.name}: ${c.description}`).join("\n")
    : "No specific capabilities listed";

  const translatedTools = ctx.toolsTranslated.length > 0
    ? ctx.toolsTranslated.map((t) => `- ${t.clientDescription}: ${t.outcomeContribution}`).join("\n")
    : "No specific technology capabilities listed";

  const addSvcs = ctx.additionalServices.length > 0
    ? ctx.additionalServices.map((s) => `- ${s.name}: ${s.clientDescription}`).join("\n")
    : null;

  const frameworks = ctx.complianceFrameworks.length > 0
    ? `Compliance frameworks: ${ctx.complianceFrameworks.join(", ")}`
    : "";

  let prompt = `Generate a client proposal for the managed security service described below.

SERVICE: ${ctx.serviceName}${ctx.serviceSubtitle ? ` — ${ctx.serviceSubtitle}` : ""}
${frameworks}

OUTCOMES THIS SERVICE DELIVERS:
${outcomesList}

CAPABILITIES (described in client-facing language):
${translatedTools}

SERVICE COMPONENTS:
${capsList}

${addSvcs ? `ADDITIONAL SERVICES INCLUDED:\n${addSvcs}\n` : ""}
${ctx.pricing ? `INVESTMENT: ${ctx.pricing.monthlyTotal}/month` : ""}

RECIPIENT:
  Company: ${ctx.client?.name ?? "the prospect"}
  Industry: ${ctx.client?.industry ?? "Not specified"}
${ctx.client?.existingContracts ? `  Existing relationship: ${ctx.client.existingContracts}` : ""}

MSP ORGANIZATION:
${JSON.stringify(orgContext, null, 2)}

GROUNDING INSTRUCTION: Base every claim in this proposal on the service data above. Use the outcome statements and translated capabilities — never mention vendor or product names. If a field is missing, omit rather than invent.

Structure: Executive Summary → What You Get → How It Works → Investment

Return JSON:
{
  "executive_summary": "string — 2-3 paragraphs opening with the client's situation",
  "services_overview": [
    {
      "name": "string — service name",
      "what_it_delivers": "string — outcome-driven description",
      "whats_included": "string — bullet list of capabilities in client language"
    }
  ],
  "pricing_summary": [
    {
      "service_name": "string",
      "price": "string — formatted price framed in value terms"
    }
  ],
  "why_us": "string — 2-3 paragraphs specific to this MSP's delivery model",
  "risk_snapshot": ["string — realistic risks relevant to this client's industry"]
}`;

  // Inject playbook intelligence if available
  if (playbook) {
    const talkTrack = playbook.talk_track as { proof_points?: string[] } | undefined;
    const cheatSheet = playbook.cheat_sheet as { differentiators?: string[] } | undefined;
    const icp = playbook.icp as { buying_triggers?: string[] } | undefined;

    const parts: string[] = [];
    if (talkTrack?.proof_points?.length)
      parts.push(`- Proof points: ${talkTrack.proof_points.join("; ")}`);
    if (cheatSheet?.differentiators?.length)
      parts.push(`- Differentiators: ${cheatSheet.differentiators.join("; ")}`);
    if (icp?.buying_triggers?.length)
      parts.push(`- Buying triggers: ${icp.buying_triggers.join("; ")}`);

    if (parts.length > 0) {
      prompt += `\n\nSales playbook intelligence (use to inform tone and specificity, do not copy verbatim):\n${parts.join("\n")}`;
    }
  }

  return prompt;
}

// ── Prospect Proposal ────────────────────────────────────────────────────────

export const PROSPECT_PROPOSAL_SYSTEM_PROMPT = `You are a proposal writer for managed security service providers. You write educational, compelling proposals for prospects who may be unfamiliar with managed security services.

${VENDOR_NAME_PROHIBITION}

${LANGUAGE_SAFETY_RULES}

PROSPECT-SPECIFIC RULES:
- Write to educate, not just sell — assume the prospect may not understand managed security services
- Include a "Why Now" section that references current threats relevant to their industry
- Lead with outcomes — what will change for their business
- Use the translated capability descriptions provided — never vendor names
- Frame additional services as extensions of the core value proposition
- Close with a clear, non-pushy call to action

Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.`;

export function buildProspectProposalPrompt(
  ctx: SalesStudioContext,
  orgContext: Record<string, unknown>,
  prospect: {
    name: string;
    industry?: string;
    size?: string;
    primaryConcern?: string;
  }
): string {
  const outcomesList = ctx.outcomes.length > 0
    ? ctx.outcomes.map((o) => `- ${o.statement}`).join("\n")
    : "No specific outcomes defined";

  const translatedTools = ctx.toolsTranslated.length > 0
    ? ctx.toolsTranslated.map((t) => `- ${t.clientDescription}: ${t.outcomeContribution}`).join("\n")
    : "No specific capabilities listed";

  const capsList = ctx.capabilities.length > 0
    ? ctx.capabilities.map((c) => `- ${c.name}: ${c.description}`).join("\n")
    : "";

  const addSvcs = ctx.additionalServices.length > 0
    ? ctx.additionalServices.map((s) => `- ${s.name}: ${s.clientDescription}`).join("\n")
    : null;

  const frameworks = ctx.complianceFrameworks.length > 0
    ? `Compliance frameworks: ${ctx.complianceFrameworks.join(", ")}`
    : "";

  return `Generate a prospect proposal for the managed security service described below.

SERVICE: ${ctx.serviceName}${ctx.serviceSubtitle ? ` — ${ctx.serviceSubtitle}` : ""}
${frameworks}

OUTCOMES THIS SERVICE DELIVERS:
${outcomesList}

CAPABILITIES (in client-facing language):
${translatedTools}

SERVICE COMPONENTS:
${capsList}

${addSvcs ? `ADDITIONAL SERVICES:\n${addSvcs}\n` : ""}
${ctx.pricing ? `STARTING INVESTMENT: ${ctx.pricing.monthlyTotal}/month` : ""}

PROSPECT:
  Company: ${prospect.name || "Prospect"}
  Industry: ${prospect.industry || "Not specified"}
  Size: ${prospect.size || "Not specified"}
  Primary concern: ${prospect.primaryConcern || "General security"}

MSP ORGANIZATION:
${JSON.stringify(orgContext, null, 2)}

GROUNDING: Use outcomes and translated capabilities only — no vendor names. More educational tone than a client proposal.

Structure: Executive Summary → What You Get → How It Works → Why Now → Investment

Return JSON:
{
  "executive_summary": "string — 2-3 paragraphs, educational tone, industry-relevant opener",
  "services_overview": [
    {
      "name": "string",
      "what_it_delivers": "string — outcome-driven",
      "whats_included": "string — bullet list in client language"
    }
  ],
  "pricing_summary": [
    {
      "service_name": "string",
      "price": "string — value-framed"
    }
  ],
  "why_us": "string — 2-3 paragraphs",
  "risk_snapshot": ["string — industry-relevant risks with a 'Why Now' framing"]
}`;
}

// ── Playbook (MSP Internal) ──────────────────────────────────────────────────

export const PLAYBOOK_SYSTEM_PROMPT = `You are a sales enablement strategist for managed security service providers (MSSPs). You produce sales playbooks that help MSP sales reps have credible, honest conversations with business buyers.

Your output must be grounded in the service data provided. You are writing specific content for a specific service with defined outcomes, named capabilities, and a real technology stack.

${LANGUAGE_SAFETY_RULES}

PLAYBOOK-SPECIFIC RULES:
- The rep does NOT need to know how individual tools work — they need to know how to articulate the service
- Tool names may appear in parenthetical references only (e.g. "endpoint protection (EDR layer)")
- Primary focus: how to talk about outcomes with a client or prospect
- The ICP must reflect the actual TARGET VERTICAL and TARGET PERSONA — not generic profiles
- The talk track must open with the OUTCOME STATEMENT as the anchor — lead with business results
- Objections must be real objections for this service category
- Email templates must be under 150 words each
- The cheat sheet one-liner must derive from the OUTCOME STATEMENT
- stack_tools in the cheat_sheet must list tool CATEGORIES only — never vendor names in customer-facing output

Output valid JSON only. No markdown fences, no commentary.`;

export function buildPlaybookPrompt(
  ctx: SalesStudioContext,
  orgContext: { orgName: string; targetVerticals: string[] }
): string {
  const outcomesList = ctx.outcomes.length > 0
    ? ctx.outcomes.map((o) => `- ${o.statement}`).join("\n")
    : "No specific outcomes defined";

  const capsList = ctx.capabilities.length > 0
    ? ctx.capabilities.map((c) => `- ${c.name}: ${c.description}`).join("\n")
    : "NOT PROVIDED — only reference capabilities if listed above";

  // Internal tools visible in playbook (parenthetical only)
  const toolsList = ctx.toolsInternal.length > 0
    ? ctx.toolsInternal.map((t) => `- ${t.name} (${t.vendor ?? "N/A"}) — ${t.category}`).join("\n")
    : "NOT PROVIDED — do not reference specific tools";

  // Translated tools for outcome language reference
  const translatedList = ctx.toolsTranslated.length > 0
    ? ctx.toolsTranslated.map((t) => `- ${t.clientDescription}: ${t.outcomeContribution}`).join("\n")
    : "";

  const addSvcs = ctx.additionalServices.length > 0
    ? ctx.additionalServices.map((s) => `- ${s.name}: ${s.clientDescription}`).join("\n")
    : null;

  const frameworks = ctx.complianceFrameworks.length > 0
    ? `Compliance frameworks: ${ctx.complianceFrameworks.join(", ")}`
    : "";

  // Primary outcome for anchoring
  const primaryOutcome = ctx.outcomes[0]?.statement ?? ctx.serviceName;

  return `Generate a complete sales playbook for the managed security service described below.

IMPORTANT: Every claim must be traceable to the data below. If a section is empty, omit references rather than inventing content.

---
SERVICE NAME: ${ctx.serviceName}
${ctx.serviceSubtitle ? `SUBTITLE: ${ctx.serviceSubtitle}` : ""}
${frameworks}
MSP NAME: ${orgContext.orgName || "This MSP"}
MSP TARGET VERTICALS: ${orgContext.targetVerticals?.join(", ") || "General"}

OUTCOMES THIS SERVICE DELIVERS:
${outcomesList}

CAPABILITIES:
${capsList}

CLIENT-FACING CAPABILITY LANGUAGE (use these phrases when coaching reps on how to describe the service):
${translatedList}

TECHNOLOGY STACK (internal reference — vendor names may appear parenthetically in the playbook, never in customer-facing email/talk track content):
${toolsList}

${addSvcs ? `ADDITIONAL SERVICES:\n${addSvcs}\n` : ""}
---

The talk_track.opening_statement and cheat_sheet.one_liner must anchor to this outcome: "${primaryOutcome}"

Structure: ICP → Talk Track → Objection Handling → Email Templates → Cheat Sheet

The talk track should flow naturally when spoken aloud. No bullet points in the talk track — flowing paragraphs a rep can adapt.

Return a JSON object with exactly these keys: icp, talk_track, objections (array of 4-6), emails (cold_outreach, follow_up, post_meeting), cheat_sheet.

{
  "icp": {
    "industries": ["string array of 4-6 target industries"],
    "company_size": "string describing ideal company size range",
    "buyer_role": "string describing the primary buyer role/title",
    "security_maturity": "string describing ideal security maturity level",
    "buying_triggers": ["string array of 4-6 events that trigger buying"],
    "qualification_questions": ["string array of 5-7 discovery questions"]
  },
  "talk_track": {
    "opening_statement": "2-3 sentence opener anchored to the outcome",
    "problem_statement": "2-3 sentences describing the pain point",
    "solution_statement": "2-3 sentences positioning the service",
    "proof_points": ["string array of 3-4 proof points from capabilities"],
    "closing_question": "single question to advance the conversation"
  },
  "objections": [
    {
      "objection": "the objection",
      "acknowledgment": "empathetic acknowledgment",
      "response": "2-3 sentence reframe",
      "follow_up_question": "question to regain momentum"
    }
  ],
  "emails": {
    "cold_outreach": { "subject": "string", "body": "string under 150 words" },
    "follow_up": { "subject": "string", "body": "string under 150 words" },
    "post_meeting": { "subject": "string", "body": "string under 150 words" }
  },
  "cheat_sheet": {
    "one_liner": "elevator pitch derived from the outcome",
    "top_verticals": ["3-4 best-fit verticals"],
    "stack_tools": ["3-5 tool CATEGORY names only, never vendor names"],
    "top_triggers": ["3-4 buying triggers"],
    "differentiators": ["3-4 key differentiators"],
    "price_anchor": "how to position pricing"
  }
}`;
}
