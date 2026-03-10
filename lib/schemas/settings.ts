import { z } from "zod";

export const workspaceSettingsSchema = z.object({
  workspace_name: z.string().min(1, "Workspace name is required").max(200),
  default_overhead_pct: z.coerce
    .number()
    .min(0, "Must be 0% or higher")
    .max(100, "Must be 100% or lower"),
  default_labor_pct: z.coerce
    .number()
    .min(0, "Must be 0% or higher")
    .max(100, "Must be 100% or lower"),
  default_target_margin_pct: z.coerce
    .number()
    .min(0, "Must be 0% or higher")
    .max(100, "Must be 100% or lower"),
  red_zone_margin_pct: z.coerce
    .number()
    .min(0, "Must be 0% or higher")
    .max(100, "Must be 100% or lower"),
  max_discount_no_approval_pct: z.coerce
    .number()
    .min(0, "Must be 0% or higher")
    .max(100, "Must be 100% or lower"),
});

export type WorkspaceSettingsFormValues = z.infer<
  typeof workspaceSettingsSchema
>;
