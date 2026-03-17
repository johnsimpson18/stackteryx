"use server";

import { callAI } from "@/lib/ai/validate";
import { generateBriefPdf } from "@/lib/export/brief-pdf";
import { generateBriefDocx } from "@/lib/export/brief-docx";
import { generateCombinedPdf } from "@/lib/export/combined-pdf";
import { generateRiskSummaryPdf } from "@/lib/export/risk-summary-pdf";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/org-context";
import { checkLimit, incrementUsage } from "@/actions/billing";
import type {
  BriefInput,
  BriefOutput,
  BriefSections,
  TechnologyRisk,
  SaveBriefInput,
  CTOBriefRecord,
} from "@/types/fractional-cto";

// Re-export types for consumers
export type {
  BriefInput,
  BriefOutput,
  BriefSections,
  TechnologyRisk,
  RadarItem,
  SaveBriefInput,
  CTOBriefRecord,
} from "@/types/fractional-cto";

// ── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a seasoned Fractional CTO advising small and mid-sized businesses on technology strategy. You write in executive business language — clear, confident, and strategic. You never recommend specific vendors or products. You focus on outcomes, resilience, governance, and strategic planning.

Rules:
- Return ONLY valid JSON. No markdown, no code fences, no commentary outside JSON.
- Tailor all content to the specified industry and company size.
- Write as a trusted technology advisor speaking directly to a business leader.
- Focus on business impact, not technical jargon.
- Be specific and actionable — avoid generic platitudes.
- Each risk item must have a severity of exactly "High", "Medium", or "Low".`;

function buildUserPrompt(input: BriefInput): string {
  const lines = [
    "Generate a Technology Strategy Brief with the following context:",
    "",
    `Client Domain: ${input.domain}`,
    `Industry: ${input.industry}`,
    `Company Size: ${input.companySize}`,
  ];

  if (input.primaryConcern) {
    lines.push(`Primary Technology Concern: ${input.primaryConcern}`);
  }

  lines.push(
    "",
    "Return a JSON object with this exact shape:",
    "",
    `{
  "executivePerspective": "2-3 paragraphs of executive-level technology perspective",
  "businessLandscape": "2-3 paragraphs analyzing the business technology landscape",
  "technologyRisks": [
    { "title": "Risk Title", "description": "Risk description", "severity": "High|Medium|Low" }
  ],
  "technologyRadar": [
    { "technology": "Technology Name", "relevance": "Why it matters", "implication": "What to do about it" }
  ],
  "strategicPriorities": ["Priority 1", "Priority 2", "..."],
  "planningOutlook": {
    "shortTerm": ["0-6 month item 1", "..."],
    "midTerm": ["6-12 month item 1", "..."],
    "longTerm": ["12-24 month item 1", "..."]
  }
}`,
    "",
    "Provide 3-5 technology risks, 4-6 technology radar items, 4-6 strategic priorities,",
    "and 3-4 items for each planning horizon.",
  );

  return lines.join("\n");
}

// ── Generate ────────────────────────────────────────────────────────────────

export async function generateCTOBrief(
  input: BriefInput,
): Promise<BriefOutput> {
  const domain = input.domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain) throw new Error("Client domain is required");
  if (!input.industry) throw new Error("Industry is required");
  if (!input.companySize) throw new Error("Company size is required");
  if (!input.mspName.trim()) throw new Error("MSP company name is required");

  // Plan limit check — AI generation
  const aiLimit = await checkLimit("aiGenerationsPerMonth");
  if (!aiLimit.allowed) {
    throw new Error("LIMIT_REACHED");
  }

  const cleanInput: BriefInput = {
    ...input,
    domain,
    mspName: input.mspName.trim(),
  };

  const sections = await callAI<BriefSections>({
    userPrompt: buildUserPrompt(cleanInput),
    requiredFields: [
      "executivePerspective",
      "businessLandscape",
      "technologyRisks",
      "technologyRadar",
      "strategicPriorities",
      "planningOutlook",
    ],
    temperature: 0.6,
    maxTokens: 6144,
    systemPrompt: SYSTEM_PROMPT,
  });

  // Increment usage after successful AI call
  await incrementUsage("ai_generation");

  // Log agent activity (fire-and-forget)
  try {
    const { logAgentActivity } = await import("@/lib/agents/log-activity");
    const actOrgId = await getActiveOrgId();
    if (actOrgId) {
      logAgentActivity({
        orgId: actOrgId,
        agentId: "sage",
        activityType: "generation",
        title: `Sage prepared a Technology Strategy Brief for ${cleanInput.domain}`,
        entityType: "brief",
        entityName: cleanInput.domain,
      });
    }
  } catch { /* never block main action */ }

  return {
    mspName: cleanInput.mspName,
    clientDomain: cleanInput.domain,
    industry: cleanInput.industry,
    generatedAt: new Date().toISOString(),
    sections,
  };
}

// ── Export Actions ───────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function exportBriefPdfAction(
  brief: BriefOutput,
): Promise<{ base64: string; filename: string }> {
  const exportLimit = await checkLimit("exportsPerMonth");
  if (!exportLimit.allowed) throw new Error("LIMIT_REACHED");

  // Determine branding tier from org's plan
  const branded = exportLimit.plan === "pro" || exportLimit.plan === "enterprise";
  const whiteLabel = exportLimit.plan === "enterprise";

  const buffer = await generateBriefPdf(brief, { branded, whiteLabel });
  await incrementUsage("export");
  return {
    base64: buffer.toString("base64"),
    filename: `${slugify(brief.clientDomain)}-technology-strategy-brief.pdf`,
  };
}

export async function exportBriefDocxAction(
  brief: BriefOutput,
): Promise<{ base64: string; filename: string }> {
  const exportLimit = await checkLimit("exportsPerMonth");
  if (!exportLimit.allowed) throw new Error("LIMIT_REACHED");

  const branded = exportLimit.plan === "pro" || exportLimit.plan === "enterprise";
  const whiteLabel = exportLimit.plan === "enterprise";

  const buffer = await generateBriefDocx(brief, { branded, whiteLabel });
  await incrementUsage("export");
  return {
    base64: buffer.toString("base64"),
    filename: `${slugify(brief.clientDomain)}-technology-strategy-brief.docx`,
  };
}

// ── Combined Export Action ───────────────────────────────────────────────────

export interface CombinedExportInput {
  briefJson: BriefSections;
  mspName: string;
  clientDomain: string;
  quarterLabel: string;
  generatedAt: string;
  proposalContent: string;
  proposalTitle: string;
}

export async function exportCombinedPdfAction(
  input: CombinedExportInput,
): Promise<{ base64: string; filename: string }> {
  const exportLimit = await checkLimit("exportsPerMonth");
  if (!exportLimit.allowed) throw new Error("LIMIT_REACHED");

  const buffer = await generateCombinedPdf({
    briefJson: input.briefJson,
    mspName: input.mspName,
    clientDomain: input.clientDomain,
    quarterLabel: input.quarterLabel,
    generatedAt: input.generatedAt,
    proposalContent: input.proposalContent,
    proposalTitle: input.proposalTitle,
  });
  await incrementUsage("export");
  return {
    base64: buffer.toString("base64"),
    filename: `${slugify(input.clientDomain)}-strategic-proposal-${slugify(input.quarterLabel)}.pdf`,
  };
}

// ── Persistence Actions (authenticated only) ────────────────────────────────

export async function saveCTOBrief(
  input: SaveBriefInput,
): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active organization");

  // Plan limit check — CTO briefs total ever
  const briefLimit = await checkLimit("ctoBriefsTotalEver");
  if (!briefLimit.allowed) {
    throw new Error("LIMIT_REACHED");
  }

  const { data, error } = await supabase
    .from("fractional_cto_briefs")
    .insert({
      org_id: orgId,
      client_id: input.clientId || null,
      domain: input.domain,
      industry: input.industry,
      company_size: input.companySize,
      primary_concern: input.primaryConcern || null,
      msp_name: input.mspName,
      quarter_label: input.quarterLabel,
      brief_json: input.briefJson,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save brief: ${error.message}`);
  return { id: data.id };
}

export async function deleteCTOBrief(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { count, error } = await supabase
    .from("fractional_cto_briefs")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) throw new Error(`Failed to delete brief: ${error.message}`);
  if (count === 0) throw new Error("Brief not found or not authorized");
}

export async function getCTOBriefs(): Promise<CTOBriefRecord[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  const { data, error } = await supabase
    .from("fractional_cto_briefs")
    .select("*, clients(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch briefs: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    clientName: (row.clients as { name: string } | null)?.name ?? null,
    domain: row.domain,
    industry: row.industry,
    companySize: row.company_size,
    primaryConcern: row.primary_concern,
    mspName: row.msp_name,
    quarterLabel: row.quarter_label,
    briefJson: row.brief_json as BriefSections,
    createdAt: row.created_at,
  }));
}

// ── Risk Summary PDF Export ─────────────────────────────────────────────────

export async function exportRiskSummaryPdfAction(input: {
  risks: TechnologyRisk[];
  mspName: string;
  clientDomain: string;
  quarterLabel: string;
}): Promise<{ base64: string; filename: string }> {
  const exportLimit = await checkLimit("exportsPerMonth");
  if (!exportLimit.allowed) throw new Error("LIMIT_REACHED");

  const branded =
    exportLimit.plan === "pro" || exportLimit.plan === "enterprise";
  const whiteLabel = exportLimit.plan === "enterprise";

  const buffer = await generateRiskSummaryPdf(input.risks, {
    mspName: input.mspName,
    clientDomain: input.clientDomain,
    quarterLabel: input.quarterLabel,
    branded,
    whiteLabel,
  });
  await incrementUsage("export");
  return {
    base64: buffer.toString("base64"),
    filename: `${slugify(input.clientDomain)}-risk-summary-${slugify(input.quarterLabel)}.pdf`,
  };
}

// ── Get Briefs for a Specific Client ────────────────────────────────────────

export async function getClientLatestBrief(
  clientId: string,
): Promise<CTOBriefRecord | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("fractional_cto_briefs")
    .select("*, clients(name)")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch brief: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    clientId: data.client_id,
    clientName: (data.clients as { name: string } | null)?.name ?? null,
    domain: data.domain,
    industry: data.industry,
    companySize: data.company_size,
    primaryConcern: data.primary_concern,
    mspName: data.msp_name,
    quarterLabel: data.quarter_label,
    briefJson: data.brief_json as BriefSections,
    createdAt: data.created_at,
  };
}
