import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, getOrgMembership } from "@/lib/org-context";
import { calculatePricing } from "@/lib/pricing/engine";
import type { PricingInput, PricingToolInput } from "@/lib/types";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a pricing advisor for an MSP (Managed Service Provider) called Stackteryx. You help MSP sales and finance teams analyze security bundle pricing, margins, and profitability.

You have deep knowledge of MSP pricing strategy and security tool bundles. You can:
- Explain pricing flags and what they mean for profitability
- Run hypothetical "what-if" scenarios (e.g., changing seat count, margin targets, or discount)
- Look up the full tool catalog to suggest alternatives or additions
- Give plain-English summaries of complex margin data
- Recommend strategies to improve margin or reduce risk

Always be concise and actionable. Use dollar amounts and percentages when referring to pricing data. When a bundle is in the red zone, proactively suggest ways to fix it.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Resolve the calling user's active org and verify membership
  const orgId = await getActiveOrgId();
  if (!orgId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const membership = await getOrgMembership(orgId);
  if (!membership) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages: uiMessages, context } = await req.json();

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\n## Current Bundle Version Context\n${JSON.stringify(context, null, 2)}`
    : SYSTEM_PROMPT;

  const messages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: systemWithContext,
    messages,
    stopWhen: stepCountIs(5),
    tools: {
      getToolCatalog: {
        description:
          "Fetch all active tools from the workspace catalog with their costs and pricing models. Use this when the user asks about available tools, wants to compare options, or needs to know what tools exist.",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from("tools")
            .select(
              "id, name, vendor, category, pricing_model, per_seat_cost, flat_monthly_cost, vendor_minimum_monthly, labor_cost_per_seat, support_complexity"
            )
            .eq("is_active", true)
            .eq("org_id", orgId)
            .order("name");

          if (error) return { error: error.message };
          return { tools: data };
        },
      },

      calculateHypotheticalPricing: {
        description:
          "Run the pricing engine with hypothetical parameters to answer 'what if' questions. For example: what margin would we get at 50 seats? What if we reduced the discount to 5%? Pass the tools array from the current context, or modify it to test scenarios.",
        inputSchema: z.object({
          seat_count: z.number().positive().describe("Number of seats"),
          target_margin_pct: z
            .number()
            .min(0)
            .max(0.99)
            .describe("Target margin as a decimal, e.g. 0.35 for 35%"),
          overhead_pct: z
            .number()
            .min(0)
            .describe("Overhead percentage as a decimal, e.g. 0.10 for 10%"),
          labor_pct: z
            .number()
            .min(0)
            .describe("Labor percentage as a decimal, e.g. 0.15 for 15%"),
          discount_pct: z
            .number()
            .min(0)
            .max(1)
            .describe("Discount percentage as a decimal, e.g. 0.10 for 10%"),
          red_zone_margin_pct: z
            .number()
            .min(0)
            .describe("Red zone margin threshold as a decimal"),
          max_discount_no_approval_pct: z
            .number()
            .min(0)
            .describe("Max discount without approval as a decimal"),
          contract_term_months: z
            .number()
            .positive()
            .describe("Contract term in months"),
          tools: z
            .array(
              z.object({
                id: z.string(),
                name: z.string(),
                pricing_model: z.enum(["per_seat", "flat_monthly", "tiered"]),
                per_seat_cost: z.number(),
                flat_monthly_cost: z.number(),
                tier_rules: z.array(z.any()).default([]),
                vendor_minimum_monthly: z.number().nullable(),
                labor_cost_per_seat: z.number().nullable(),
                quantity_multiplier: z.number().default(1),
              })
            )
            .describe("The tools to include in this hypothetical calculation"),
        }),
        execute: async (params) => {
          const pricingInput: PricingInput = {
            tools: params.tools as PricingToolInput[],
            seat_count: params.seat_count,
            target_margin_pct: params.target_margin_pct,
            overhead_pct: params.overhead_pct,
            labor_pct: params.labor_pct,
            discount_pct: params.discount_pct,
            red_zone_margin_pct: params.red_zone_margin_pct,
            max_discount_no_approval_pct: params.max_discount_no_approval_pct,
            contract_term_months: params.contract_term_months,
          };

          return calculatePricing(pricingInput);
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
