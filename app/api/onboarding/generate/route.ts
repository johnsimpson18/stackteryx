import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { stripCodeFences } from "@/lib/ai/validate";
import { getOnboardingProfile, markOnboardingComplete, saveGeneratedBundlesJson, upsertOrgSettings } from "@/lib/db/org-settings";
import { getOnboardingTools } from "@/lib/db/onboarding-tools";
import { createBundle } from "@/lib/db/bundles";
import { createVersion } from "@/lib/db/bundle-versions";
import { createTool, getTools } from "@/lib/db/tools";
import { upsertEnablement } from "@/lib/db/enablement";
import { createOrgVendor, createCostModel } from "@/lib/db/vendors";
import { getOrgById } from "@/lib/db/orgs";
import type {
  OnboardingProfile,
  OnboardingToolSelection,
  ToolCategory,
  PricingModel,
  BundleType,
  BillingBasis,
} from "@/lib/types";

export const maxDuration = 60;

// ── Category / pricing mappings ─────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ToolCategory> = {
  "Endpoint Protection": "edr",
  "SIEM & SOC": "siem",
  "Identity & Access": "identity",
  "Email Security": "email_security",
  "Network Security": "network_monitoring",
  "Backup & Recovery": "backup",
  "Vulnerability Management": "vulnerability_management",
  "Security Awareness": "security_awareness_training",
  "GRC & Compliance": "documentation",
  "RMM & PSA": "rmm",
};

const PRICING_MODEL_MAP: Record<string, PricingModel> = {
  per_user: "per_user",
  per_device: "per_seat",
  flat_monthly: "flat_monthly",
  per_org: "per_org",
  per_domain: "per_user",
  per_location: "per_seat",
  usage: "per_user",
  tiered: "tiered",
};

const BILLING_BASIS_VENDOR_MAP: Record<string, BillingBasis> = {
  per_user: "per_user",
  per_device: "per_device",
  flat_monthly: "flat_monthly",
  per_org: "per_org",
  per_domain: "per_domain",
  per_location: "per_location",
  usage: "usage",
  tiered: "tiered",
};

const BUNDLE_TYPE_MAP: Record<string, BundleType> = {
  one_managed: "custom",
  multiple_tiers: "tiered",
  a_la_carte: "ala_carte",
  mix_all: "custom",
};

const SALES_MODEL_PROMPT_MAP: Record<string, string> = {
  one_managed: "single",
  multiple_tiers: "tiered",
  a_la_carte: "alacarte",
  mix_all: "mixed",
};

// ── AI response shape ───────────────────────────────────────────────────────

interface AIBundle {
  name: string;
  tagline: string;
  description: string;
  idealFor: string;
  tools: string[];
  complianceAlignment: Record<string, number>;
  talkingPoints: string[];
}

interface AIResponse {
  bundles: AIBundle[];
  topInsight: string;
}

// ── Prompt construction ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert managed security services consultant helping an MSSP build their service bundle catalog. You will be given information about their business and tool stack. Your job is to intelligently design security service bundles that reflect how real MSSPs package and sell their services.

You must respond with valid JSON only. No preamble, no markdown, no explanation. Only the JSON object.`;

function buildUserPrompt(
  profile: OnboardingProfile,
  tools: OnboardingToolSelection[]
): string {
  const salesModelKey = profile.sales_model ?? "mix_all";
  const promptModel = SALES_MODEL_PROMPT_MAP[salesModelKey] ?? "mixed";

  const toolsJson = tools.map((t) => ({
    name: t.tool_name,
    category: t.category,
    billingBasis: t.billing_basis,
    costAmount: t.cost_amount,
    sellAmount: t.sell_amount,
  }));

  return `Build service bundles for this MSSP:

Company: ${profile.founder_name ?? "Unknown"}
Size: ${profile.company_size ?? "Unknown"}
Geography: ${(profile.primary_geographies ?? []).join(", ") || "Not specified"}
Target verticals: ${(profile.target_verticals ?? []).join(", ") || "Not specified"}
Client sizes: ${(profile.client_sizes ?? []).join(", ") || "Not specified"}
Buyer personas: ${(profile.buyer_personas ?? []).join(", ") || "Not specified"}

Sales model: ${promptModel}
Delivery model: ${(profile.delivery_models ?? []).join(", ") || "Not specified"}
Target margin: ${profile.target_margin_pct ?? 35}%

Services offered: ${[...(profile.services_offered ?? []), ...(profile.services_custom ?? [])].join(", ") || "Not specified"}
Compliance frameworks targeted: ${(profile.compliance_targets ?? []).join(", ") || "None specified"}

Tool stack with pricing:
${JSON.stringify(toolsJson, null, 2)}

Additional context: ${profile.additional_context ?? "None"}

Based on their sales model (${promptModel}), build the appropriate bundles:

IF salesModel is 'single':
  Build exactly 1 bundle using ALL their tools. Include every tool they have priced. Name it something professional.

IF salesModel is 'tiered':
  Build exactly 3 bundles: Essential, Advanced, and Complete (or equivalent tier names that fit their brand/vertical). Essential: core endpoint + email + backup tools. Advanced: Essential + identity + network tools. Complete: All tools, maximum coverage. Each tier must be a strict superset of the previous tier.

IF salesModel is 'alacarte':
  Build 3 bundles organized by use case: One focused on endpoint/threat detection, one on compliance/GRC, one on identity/access. Tools can overlap between bundles.

IF salesModel is 'mixed':
  Build 3 bundles: One core managed offering (all tools), one compliance-focused, one endpoint-focused.

For EACH bundle, provide:
  name: string (professional, market-ready)
  tagline: string (one sentence, compelling)
  description: string (2-3 sentences explaining what it covers and who it is for, written for a sales conversation)
  idealFor: string (which client profile this fits — reference their verticals and sizes)
  tools: array of tool names from their stack
  complianceAlignment: object mapping each of their target compliance frameworks to a coverage percentage (0-100) based on which tools in this bundle map to that framework's controls. Be realistic — no bundle achieves 100% on any framework through tooling alone.
  talkingPoints: array of 3 strings — sales talking points for this bundle

Also provide a top-level summary:
  topInsight: string — one key observation about their stack or pricing (e.g. a gap, a strength, or a margin observation)

Return this exact JSON structure:
{
  "bundles": [
    {
      "name": "string",
      "tagline": "string",
      "description": "string",
      "idealFor": "string",
      "tools": ["string"],
      "complianceAlignment": { "framework": 0 },
      "talkingPoints": ["string"]
    }
  ],
  "topInsight": "string"
}`;
}

// ── Response parsing ────────────────────────────────────────────────────────

function parseOnboardingAIResponse(text: string): AIResponse {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ── Tool record creation ────────────────────────────────────────────────────

async function ensureToolRecords(
  orgId: string,
  onboardingTools: OnboardingToolSelection[]
): Promise<Map<string, string>> {
  const existingTools = await getTools(orgId);
  const toolMap = new Map<string, string>();
  for (const t of existingTools) {
    toolMap.set(t.name, t.id);
  }

  for (const onbTool of onboardingTools) {
    if (toolMap.has(onbTool.tool_name)) continue;

    const category = CATEGORY_MAP[onbTool.category] ?? ("other" as ToolCategory);
    const pricingModel =
      PRICING_MODEL_MAP[onbTool.billing_basis ?? ""] ?? ("per_user" as PricingModel);
    const cost = onbTool.cost_amount ?? 0;

    const tool = await createTool({
      org_id: orgId,
      name: onbTool.tool_name,
      vendor: onbTool.vendor_name || onbTool.tool_name,
      category,
      pricing_model: pricingModel,
      per_seat_cost: pricingModel === "per_seat" ? cost : 0,
      per_user_cost: pricingModel === "per_user" ? cost : 0,
      flat_monthly_cost: pricingModel === "flat_monthly" ? cost : 0,
      per_org_cost: pricingModel === "per_org" ? cost : 0,
      annual_flat_cost: pricingModel === "annual_flat" ? cost : 0,
      tier_rules: [],
      vendor_minimum_monthly: onbTool.min_commitment,
      labor_cost_per_seat: null,
      support_complexity: 1,
      renewal_uplift_pct: 0,
      percent_discount: 0,
      flat_discount: 0,
      min_monthly_commit: onbTool.min_commitment,
    });
    toolMap.set(onbTool.tool_name, tool.id);
  }

  return toolMap;
}

// ── Org vendor + cost model creation ─────────────────────────────────────────

async function ensureOrgVendors(
  orgId: string,
  userId: string,
  onboardingTools: OnboardingToolSelection[]
): Promise<void> {
  // Group tools by vendor_name
  const vendorToolsMap = new Map<string, OnboardingToolSelection[]>();
  for (const tool of onboardingTools) {
    const vendorName = tool.vendor_name || tool.tool_name;
    const existing = vendorToolsMap.get(vendorName) ?? [];
    existing.push(tool);
    vendorToolsMap.set(vendorName, existing);
  }

  for (const [vendorName, tools] of vendorToolsMap) {
    try {
      // Create org_vendor
      const orgVendor = await createOrgVendor(orgId, userId, {
        display_name: vendorName,
        category: tools[0]?.category ?? null,
      });

      // Create a cost_model for each tool under this vendor
      for (const tool of tools) {
        const billingBasis: BillingBasis =
          BILLING_BASIS_VENDOR_MAP[tool.billing_basis ?? ""] ?? "per_user";

        try {
          await createCostModel(orgId, userId, {
            org_vendor_id: orgVendor.id,
            name: tool.tool_name,
            billing_basis: billingBasis,
            cadence: "monthly",
          });
        } catch (err) {
          console.error(
            `[onboarding-generate] Failed to create cost model for "${tool.tool_name}":`,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        `[onboarding-generate] Failed to create org vendor "${vendorName}":`,
        err
      );
    }
  }
}

// ── SSE route handler ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) {
    return new Response("Missing org_id", { status: 400 });
  }

  // Verify membership
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (!member) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  const anthropic = new Anthropic();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Step 1 — Analyze tool catalog
        emit({ step: 1, status: "active" });
        const [profile, tools] = await Promise.all([
          getOnboardingProfile(orgId),
          getOnboardingTools(orgId),
        ]);
        if (!profile) throw new Error("Onboarding profile not found");

        // Step 2 — Map services to verticals
        emit({ step: 2, status: "active" });
        const userPrompt = buildUserPrompt(profile, tools);

        // Step 3 — Model pricing structure (AI call)
        emit({ step: 3, status: "active" });
        const aiResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        // Step 4 — Build service bundles (parse)
        emit({ step: 4, status: "active" });
        const responseText =
          aiResponse.content[0].type === "text" ? aiResponse.content[0].text : "";
        const parsed = parseOnboardingAIResponse(responseText);
        if (!parsed.bundles || parsed.bundles.length === 0) {
          throw new Error("AI returned no bundles");
        }

        // Step 5 — Calculate margin scenarios (create tool records + org vendors)
        emit({ step: 5, status: "active" });
        const toolIdMap = await ensureToolRecords(orgId, tools);
        await ensureOrgVendors(orgId, user.id, tools);

        // Step 6 — Map compliance framework coverage (create bundles + versions)
        emit({ step: 6, status: "active" });
        const salesModel = profile.sales_model ?? "mix_all";
        const bundleType = BUNDLE_TYPE_MAP[salesModel] ?? ("custom" as BundleType);

        const bundleResults: Array<{
          bundleId: string;
          versionId: string;
        }> = [];

        for (const aiBundle of parsed.bundles) {
          try {
            const bundle = await createBundle({
              org_id: orgId,
              name: aiBundle.name,
              bundle_type: bundleType,
              description: aiBundle.description,
              created_by: user.id,
            });

            const toolIds = aiBundle.tools
              .map((name) => toolIdMap.get(name))
              .filter((id): id is string => !!id);

            if (toolIds.length === 0) {
              bundleResults.push({ bundleId: bundle.id, versionId: "" });
              continue;
            }

            const { version } = await createVersion({
              bundle_id: bundle.id,
              seat_count: 50,
              risk_tier: "medium",
              contract_term_months: 12,
              target_margin_pct: profile.target_margin_pct ?? 35,
              overhead_pct: 5,
              labor_pct: 10,
              discount_pct: 0,
              notes: "Auto-generated during onboarding",
              tools: toolIds.map((id) => ({
                tool_id: id,
                quantity_multiplier: 1,
              })),
              created_by: user.id,
              red_zone_margin_pct: 15,
              max_discount_no_approval_pct: 10,
            });

            bundleResults.push({
              bundleId: bundle.id,
              versionId: version.id,
            });
          } catch (err) {
            console.error(
              `[onboarding-generate] Failed to create bundle "${aiBundle.name}":`,
              err
            );
            bundleResults.push({ bundleId: "", versionId: "" });
          }
        }

        // Step 7 — Generate bundle descriptions (enablement)
        emit({ step: 7, status: "active" });
        for (let i = 0; i < parsed.bundles.length; i++) {
          const aiBundle = parsed.bundles[i];
          const result = bundleResults[i];
          if (!result?.versionId) continue;

          try {
            await upsertEnablement(orgId, user.id, result.versionId, {
              service_overview: aiBundle.description,
              talking_points: aiBundle.talkingPoints.join("\n"),
              why_us: aiBundle.tagline,
            });
          } catch (err) {
            console.error(
              `[onboarding-generate] Failed to create enablement for "${aiBundle.name}":`,
              err
            );
          }
        }

        // Step 8 — Prepare workspace (sync settings + mark complete)
        emit({ step: 8, status: "active" });

        // Sync onboarding data into settings JSON for the settings page
        // Must run BEFORE saveGeneratedBundlesJson so it doesn't overwrite it
        const org = await getOrgById(orgId);
        const targetMarginDecimal = (profile.target_margin_pct ?? 35) / 100;
        await upsertOrgSettings(orgId, {
          workspace_name: org?.name ?? "Workspace",
          default_target_margin_pct: targetMarginDecimal,
        });

        // Store AI response for results reveal page (after upsertOrgSettings)
        const generatedBundlesData = {
          topInsight: parsed.topInsight,
          bundles: parsed.bundles.map((aiBundle, i) => ({
            name: aiBundle.name,
            tagline: aiBundle.tagline,
            description: aiBundle.description,
            idealFor: aiBundle.idealFor,
            tools: aiBundle.tools,
            complianceAlignment: aiBundle.complianceAlignment,
            talkingPoints: aiBundle.talkingPoints,
            bundleId: bundleResults[i]?.bundleId ?? "",
            versionId: bundleResults[i]?.versionId ?? "",
          })),
        };
        await saveGeneratedBundlesJson(orgId, generatedBundlesData);

        await markOnboardingComplete(orgId, true);

        emit({ step: 8, status: "complete", done: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[onboarding-generate] Fatal error:", msg);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
