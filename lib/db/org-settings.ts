import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";
import type { OnboardingProfile } from "@/lib/types";

type OrgSettingsRow = Database["public"]["Tables"]["org_settings"]["Row"];

/**
 * Parsed org settings with typed fields extracted from the JSON `settings` column.
 * Replaces WorkspaceSettings — uses org_id as PK (no separate id field).
 */
export interface OrgSettings {
  org_id: string;
  workspace_name: string;
  default_overhead_pct: number;
  default_labor_pct: number;
  default_target_margin_pct: number;
  red_zone_margin_pct: number;
  max_discount_no_approval_pct: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/** Shape of the JSON blob stored inside org_settings.settings */
export type OrgSettingsJson = Omit<OrgSettings, "org_id" | "created_at" | "updated_at">;

function parseRow(row: OrgSettingsRow): OrgSettings {
  const s = (row.settings ?? {}) as Record<string, unknown>;
  return {
    org_id: row.org_id,
    workspace_name: (s.workspace_name as string) ?? "Workspace",
    default_overhead_pct: (s.default_overhead_pct as number) ?? 0.10,
    default_labor_pct: (s.default_labor_pct as number) ?? 0.15,
    default_target_margin_pct: (s.default_target_margin_pct as number) ?? 0.35,
    red_zone_margin_pct: (s.red_zone_margin_pct as number) ?? 0.15,
    max_discount_no_approval_pct: (s.max_discount_no_approval_pct as number) ?? 0.10,
    onboarding_completed: (s.onboarding_completed as boolean) ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Fetch org settings, returning safe defaults if no row exists.
 * Use this in server actions that should never fail due to missing settings.
 */
export async function getOrgSettingsOrDefaults(orgId: string): Promise<OrgSettings> {
  const settings = await getOrgSettings(orgId);
  if (settings) return settings;
  return {
    org_id: orgId,
    workspace_name: "Workspace",
    default_overhead_pct: 0.10,
    default_labor_pct: 0.15,
    default_target_margin_pct: 0.35,
    red_zone_margin_pct: 0.15,
    max_discount_no_approval_pct: 0.10,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fetch the org_settings row for the given org.
 * Returns null if no row exists.
 */
export async function getOrgSettings(
  orgId: string
): Promise<OrgSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return parseRow(data);
}

/**
 * Insert or update the org_settings row for the given org.
 * Merges the provided fields into the existing settings JSON.
 */
export async function upsertOrgSettings(
  orgId: string,
  update: Partial<OrgSettingsJson>
): Promise<OrgSettings> {
  const supabase = await createClient();

  // Read existing RAW settings so we preserve unknown keys (e.g. generated_bundles_json)
  const { data: existingRow } = await supabase
    .from("org_settings")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const rawSettings = (existingRow?.settings ?? {}) as Record<string, unknown>;
  const existing = existingRow ? parseRow(existingRow) : null;

  // Layer: raw (preserves unknown keys) → known defaults → update
  const merged = {
    ...rawSettings,
    workspace_name: existing?.workspace_name ?? "Workspace",
    default_overhead_pct: existing?.default_overhead_pct ?? 0.10,
    default_labor_pct: existing?.default_labor_pct ?? 0.15,
    default_target_margin_pct: existing?.default_target_margin_pct ?? 0.35,
    red_zone_margin_pct: existing?.red_zone_margin_pct ?? 0.15,
    max_discount_no_approval_pct: existing?.max_discount_no_approval_pct ?? 0.10,
    onboarding_completed: existing?.onboarding_completed ?? false,
    ...update,
  };

  const { data, error } = await supabase
    .from("org_settings")
    .upsert(
      { org_id: orgId, settings: merged as unknown as Database["public"]["Tables"]["org_settings"]["Insert"]["settings"] },
      { onConflict: "org_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return parseRow(data);
}

/**
 * Ensure an org_settings row exists for the given org.
 * Creates one with defaults (onboarding_complete = false) if missing.
 */
export async function ensureOrgSettings(orgId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_settings")
    .upsert(
      { org_id: orgId, settings: {} as unknown as Database["public"]["Tables"]["org_settings"]["Insert"]["settings"] },
      { onConflict: "org_id", ignoreDuplicates: true }
    );
  if (error) throw error;
}

// ── Onboarding wizard helpers ───────────────────────────────────────────────

const ONBOARDING_COLUMNS = `
  company_size, primary_geographies, founder_name, founder_title,
  target_verticals, client_sizes, buyer_personas,
  services_offered, services_custom,
  sales_model, delivery_models, sales_team_type,
  target_margin_pct, compliance_targets, additional_context,
  onboarding_step, onboarding_complete, onboarding_completed_at, bundles_generated
`.trim();

/**
 * Fetch all onboarding-related columns from org_settings for the given org.
 */
export async function getOnboardingProfile(
  orgId: string
): Promise<OnboardingProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_settings")
    .select(ONBOARDING_COLUMNS)
    .eq("org_id", orgId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data as unknown as OnboardingProfile;
}

/**
 * Upsert only the columns relevant to the given step number.
 * Always advances onboarding_step to at least the provided step.
 */
export async function saveOnboardingStep(
  orgId: string,
  step: number,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  let update: Record<string, unknown> = {};

  switch (step) {
    case 1:
      update = {
        company_size: data.company_size ?? null,
        primary_geographies: data.primary_geographies ?? null,
        founder_name: data.founder_name ?? null,
        founder_title: data.founder_title ?? null,
      };
      break;
    case 2:
      update = {
        target_verticals: data.target_verticals ?? null,
        client_sizes: data.client_sizes ?? null,
        buyer_personas: data.buyer_personas ?? null,
      };
      break;
    case 3:
      update = {
        services_offered: data.services_offered ?? null,
        services_custom: data.services_custom ?? null,
      };
      break;
    case 6:
      update = {
        sales_model: data.sales_model ?? null,
        delivery_models: data.delivery_models ?? null,
        sales_team_type: data.sales_team_type ?? null,
      };
      break;
    case 7:
      update = {
        target_margin_pct: data.target_margin_pct ?? null,
        compliance_targets: data.compliance_targets ?? null,
        additional_context: data.additional_context ?? null,
      };
      break;
    default:
      // Steps 4, 5 etc. store tool selections in onboarding_tool_selections,
      // not in org_settings columns. Just advance the step counter.
      break;
  }

  // Read current step to take the max
  const existing = await getOnboardingProfile(orgId);
  const currentStep = existing?.onboarding_step ?? 0;

  update.onboarding_step = Math.max(currentStep, step);

  // Use upsert so it works even if no org_settings row exists yet
  const { error } = await supabase
    .from("org_settings")
    .upsert(
      { org_id: orgId, ...update },
      { onConflict: "org_id" }
    );

  if (error) throw error;
}

/**
 * Store the AI-generated bundles JSON in the settings column.
 * This data powers the results reveal page.
 */
export async function saveGeneratedBundlesJson(
  orgId: string,
  data: unknown
): Promise<void> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("org_settings")
    .select("settings")
    .eq("org_id", orgId)
    .single();

  const existing = (row?.settings ?? {}) as Record<string, unknown>;
  const merged = { ...existing, generated_bundles_json: data };

  const { error } = await supabase
    .from("org_settings")
    .update({ settings: merged })
    .eq("org_id", orgId);

  if (error) throw error;
}

/**
 * Retrieve the AI-generated bundles JSON from the settings column.
 * Returns null if not stored yet.
 */
export async function getGeneratedBundlesJson(
  orgId: string
): Promise<unknown | null> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("org_settings")
    .select("settings")
    .eq("org_id", orgId)
    .single();

  if (!row) return null;
  const s = (row.settings ?? {}) as Record<string, unknown>;
  return s.generated_bundles_json ?? null;
}

/**
 * Mark onboarding as complete.
 */
export async function markOnboardingComplete(
  orgId: string,
  bundlesGenerated: boolean
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("org_settings")
    .update({
      onboarding_complete: true,
      onboarding_completed_at: new Date().toISOString(),
      bundles_generated: bundlesGenerated,
    })
    .eq("org_id", orgId);

  if (error) throw error;
}
