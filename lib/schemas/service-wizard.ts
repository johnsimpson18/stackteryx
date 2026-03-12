import { z } from "zod";

// ── Step 1: Outcome ──────────────────────────────────────────────────────────

export const outcomeStepSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  outcome_type: z.enum(["compliance", "efficiency", "security", "growth", "custom"]),
  outcome_statement: z.string().max(2000).default(""),
  target_vertical: z.string().max(200).default(""),
  target_persona: z.string().max(200).default(""),
});

export type OutcomeStepValues = z.infer<typeof outcomeStepSchema>;

// ── Step 2: Service Definition ───────────────────────────────────────────────

export const serviceCapabilitySchema = z.object({
  name: z.string().min(1, "Capability name is required").max(200),
  description: z.string().max(2000).default(""),
});

export const serviceStepSchema = z.object({
  service_capabilities: z.array(serviceCapabilitySchema).default([]),
  bundle_type: z.enum(["ala_carte", "tiered", "vertical", "custom"]),
});

export type ServiceStepValues = z.infer<typeof serviceStepSchema>;

// ── Step 3: Stack / Tool Selection ───────────────────────────────────────────

export const stackToolSchema = z.object({
  tool_id: z.string().uuid("Invalid tool ID"),
  quantity_multiplier: z.coerce.number().min(0.1).default(1.0),
});

export const stackStepSchema = z.object({
  tools: z.array(stackToolSchema).min(1, "At least one tool is required"),
});

export type StackStepValues = z.infer<typeof stackStepSchema>;

// ── Step 4: Economics / Pricing ──────────────────────────────────────────────

export const economicsStepSchema = z.object({
  seat_count: z.coerce.number().int().min(1).default(30),
  risk_tier: z.enum(["low", "medium", "high"]).default("medium"),
  contract_term_months: z.coerce.number().int().min(1).default(12),
  target_margin_pct: z.coerce.number().min(0).max(0.99).default(0.35),
  overhead_pct: z.coerce.number().min(0).max(1).default(0.10),
  labor_pct: z.coerce.number().min(0).max(1).default(0.15),
  discount_pct: z.coerce.number().min(0).max(0.99).default(0),
  tools: z.array(stackToolSchema).min(1, "At least one tool is required"),
  additional_service_ids: z.array(z.string().uuid()).default([]),
});

export type EconomicsStepValues = z.infer<typeof economicsStepSchema>;

// ── Step 5: Enablement Content ───────────────────────────────────────────────

export const enablementStepSchema = z.object({
  service_overview: z.string().max(5000).default(""),
  whats_included: z.string().max(5000).default(""),
  talking_points: z.string().max(5000).default(""),
  pricing_narrative: z.string().max(5000).default(""),
  why_us: z.string().max(5000).default(""),
});

export type EnablementStepValues = z.infer<typeof enablementStepSchema>;
