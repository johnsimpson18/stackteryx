import { z } from "zod";

// Legacy tier rule (used by "tiered" model — per-seat, endpoint-based)
export const tierRuleSchema = z.object({
  minSeats: z.coerce.number().int().min(0),
  maxSeats: z.coerce.number().int().min(0).nullable(),
  costPerSeat: z.coerce.number().min(0),
  // New optional fields for tiered_by_metric
  priceType: z.enum(["unitMonthly", "flatMonthly", "annualFlat"]).optional(),
  unitPriceMonthly: z.coerce.number().min(0).optional(),
  flatMonthly: z.coerce.number().min(0).optional(),
  annualFlat: z.coerce.number().min(0).optional(),
});

export const toolFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    vendor: z.string().min(1, "Vendor is required").max(200),
    category: z.enum([
      "edr",
      "siem",
      "email_security",
      "identity",
      "backup",
      "vulnerability_management",
      "dns_filtering",
      "mfa",
      "security_awareness_training",
      "documentation",
      "rmm",
      "psa",
      "network_monitoring",
      "dark_web",
      "mdr",
      "other",
    ]),
    pricing_model: z.enum([
      "per_seat",
      "flat_monthly",
      "tiered",
      "per_user",
      "per_org",
      "annual_flat",
      "tiered_by_metric",
    ]),
    tier_metric: z.enum(["endpoints", "users", "headcount"]).default("endpoints"),
    // Legacy cost fields
    per_seat_cost: z.coerce.number().min(0).default(0),
    flat_monthly_cost: z.coerce.number().min(0).default(0),
    tier_rules: z.array(tierRuleSchema).default([]),
    vendor_minimum_monthly: z.coerce.number().min(0).nullable().default(null),
    labor_cost_per_seat: z.coerce.number().min(0).nullable().default(null),
    support_complexity: z.coerce.number().int().min(1).max(5).default(3),
    renewal_uplift_pct: z.coerce.number().min(0).max(1).default(0),
    // v2 cost model fields
    annual_flat_cost: z.coerce.number().min(0).default(0),
    per_user_cost: z.coerce.number().min(0).default(0),
    per_org_cost: z.coerce.number().min(0).default(0),
    // v2 discount fields
    percent_discount: z.coerce.number().min(0).max(1).default(0),
    flat_discount: z.coerce.number().min(0).default(0),
    min_monthly_commit: z.coerce.number().min(0).nullable().default(null),
  })
  .superRefine((data, ctx) => {
    // Legacy model validations
    if (data.pricing_model === "per_seat" && data.per_seat_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per-seat cost is required for per-seat pricing",
        path: ["per_seat_cost"],
      });
    }
    if (data.pricing_model === "flat_monthly" && data.flat_monthly_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monthly cost is required for flat monthly pricing",
        path: ["flat_monthly_cost"],
      });
    }
    if (data.pricing_model === "tiered" && data.tier_rules.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one tier rule is required for tiered pricing",
        path: ["tier_rules"],
      });
    }
    // v2 model validations
    if (data.pricing_model === "annual_flat" && data.annual_flat_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Annual flat cost is required for annual flat pricing",
        path: ["annual_flat_cost"],
      });
    }
    if (data.pricing_model === "per_user" && data.per_user_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per-user cost is required for per-user pricing",
        path: ["per_user_cost"],
      });
    }
    if (data.pricing_model === "per_org" && data.per_org_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per-org cost is required for per-org pricing",
        path: ["per_org_cost"],
      });
    }
    if (
      data.pricing_model === "tiered_by_metric" &&
      data.tier_rules.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one tier rule is required for tiered-by-metric pricing",
        path: ["tier_rules"],
      });
    }
  });

export type ToolFormValues = z.infer<typeof toolFormSchema>;
