import { createClient } from "@/lib/supabase/server";

// ── Types ────────────────────────────────────────────────────────────────────

export interface OrgComplianceTarget {
  id: string;
  org_id: string;
  framework_id: string;
  enabled: boolean;
  created_at: string;
}

export interface ClientComplianceScoreRow {
  id: string;
  client_id: string;
  org_id: string;
  framework_id: string;
  controls_total: number;
  controls_satisfied: number;
  controls_partial: number;
  controls_gap: number;
  controls_manual: number;
  score_pct: number;
  score_unweighted_pct: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  domain_scores: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gap_details: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  suggested_services: any;
  computed_at: string;
}

// ── Org Compliance Targets ──────────────────────────────────────────────────

export async function getOrgComplianceTargets(
  orgId: string
): Promise<OrgComplianceTarget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_compliance_targets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrgComplianceTarget[];
}

export async function enableComplianceFramework(
  orgId: string,
  frameworkId: string
): Promise<OrgComplianceTarget> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_compliance_targets")
    .upsert(
      { org_id: orgId, framework_id: frameworkId, enabled: true },
      { onConflict: "org_id,framework_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as OrgComplianceTarget;
}

export async function disableComplianceFramework(
  orgId: string,
  frameworkId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_compliance_targets")
    .delete()
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId);

  if (error) throw error;
}

// ── Client Compliance Scores ────────────────────────────────────────────────

export async function getClientComplianceScores(
  orgId: string,
  clientId: string
): Promise<ClientComplianceScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_compliance_scores")
    .select("*")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .order("computed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClientComplianceScoreRow[];
}

export async function getClientComplianceScore(
  orgId: string,
  clientId: string,
  frameworkId: string
): Promise<ClientComplianceScoreRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_compliance_scores")
    .select("*")
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .eq("framework_id", frameworkId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as ClientComplianceScoreRow;
}

/** Get all compliance scores for an org (for the portfolio grid) */
export async function getAllComplianceScores(
  orgId: string,
  frameworkId: string
): Promise<ClientComplianceScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_compliance_scores")
    .select("*")
    .eq("org_id", orgId)
    .eq("framework_id", frameworkId)
    .order("score_pct", { ascending: true })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as ClientComplianceScoreRow[];
}

export async function deleteClientComplianceScore(
  orgId: string,
  clientId: string,
  frameworkId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_compliance_scores")
    .delete()
    .eq("org_id", orgId)
    .eq("client_id", clientId)
    .eq("framework_id", frameworkId);

  if (error) throw error;
}
