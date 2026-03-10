import { z } from "zod";

export const createBundleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  bundle_type: z.enum(["ala_carte", "tiered", "vertical", "custom"]),
  description: z.string().max(2000).default(""),
});

export type CreateBundleValues = z.infer<typeof createBundleSchema>;

export const updateBundleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  bundle_type: z.enum(["ala_carte", "tiered", "vertical", "custom"]).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export type UpdateBundleValues = z.infer<typeof updateBundleSchema>;

export const versionToolSchema = z.object({
  tool_id: z.string().uuid("Invalid tool ID"),
  quantity_multiplier: z.coerce.number().min(0.1, "Multiplier must be at least 0.1").default(1.0),
});

export const createVersionSchema = z.object({
  // Legacy fields — kept for DB compat; builder provides defaults
  seat_count: z.coerce.number().int().min(0).default(30),
  risk_tier: z.enum(["low", "medium", "high"]).default("medium"),
  contract_term_months: z.coerce.number().int().min(1).default(12),
  target_margin_pct: z.coerce.number().min(0).max(0.99).default(0.35),
  overhead_pct: z.coerce.number().min(0).max(1).default(0.10),
  labor_pct: z.coerce.number().min(0).max(1).default(0.15),
  discount_pct: z.coerce.number().min(0).max(0.99).default(0),
  notes: z.string().max(5000).default(""),
  tools: z.array(versionToolSchema).min(1, "At least one tool is required"),
  // v2 sell-strategy fields
  sell_strategy: z
    .enum(["cost_plus_margin", "monthly_flat_rate", "per_endpoint_monthly", "per_user_monthly"])
    .default("cost_plus_margin"),
  sell_config: z
    .object({
      strategy: z.string(),
      monthly_flat_price: z.number().optional(),
      per_endpoint_sell_price: z.number().optional(),
      per_user_sell_price: z.number().optional(),
      target_margin_pct: z.number().optional(),
    })
    .optional(),
  assumptions: z
    .object({
      endpoints: z.number().default(30),
      users: z.number().default(30),
      org_count: z.number().default(1),
    })
    .optional(),
});

export type CreateVersionValues = z.infer<typeof createVersionSchema>;
