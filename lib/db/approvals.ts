import { createClient } from "@/lib/supabase/server";
import type { Approval, ApprovalStatus, ApprovalWithMeta } from "@/lib/types";

export async function getApprovals(
  orgId?: string,
  status?: ApprovalStatus | "all"
): Promise<ApprovalWithMeta[]> {
  const supabase = await createClient();

  let query = supabase
    .from("approvals")
    .select(`
      *,
      requester:profiles!approvals_requested_by_fkey(display_name),
      reviewer:profiles!approvals_reviewer_id_fkey(display_name)
    `)
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    org_id: row.org_id,
    bundle_id: row.bundle_id,
    bundle_version_id: row.bundle_version_id,
    requested_by: row.requested_by,
    status: row.status as ApprovalStatus,
    discount_pct: Number(row.discount_pct),
    margin_pct: row.margin_pct !== null ? Number(row.margin_pct) : null,
    mrr: row.mrr !== null ? Number(row.mrr) : null,
    seat_count: row.seat_count,
    bundle_name: row.bundle_name,
    version_number: row.version_number,
    notes: row.notes,
    reviewer_id: row.reviewer_id,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requester_name: (row as any).requester?.display_name ?? "Unknown",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reviewer_name: (row as any).reviewer?.display_name ?? null,
  }));
}

export async function getApprovalById(
  id: string
): Promise<ApprovalWithMeta | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("approvals")
    .select(`
      *,
      requester:profiles!approvals_requested_by_fkey(display_name),
      reviewer:profiles!approvals_reviewer_id_fkey(display_name)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return {
    id: data.id,
    org_id: data.org_id,
    bundle_id: data.bundle_id,
    bundle_version_id: data.bundle_version_id,
    requested_by: data.requested_by,
    status: data.status as ApprovalStatus,
    discount_pct: Number(data.discount_pct),
    margin_pct: data.margin_pct !== null ? Number(data.margin_pct) : null,
    mrr: data.mrr !== null ? Number(data.mrr) : null,
    seat_count: data.seat_count,
    bundle_name: data.bundle_name,
    version_number: data.version_number,
    notes: data.notes,
    reviewer_id: data.reviewer_id,
    reviewed_at: data.reviewed_at,
    review_notes: data.review_notes,
    created_at: data.created_at,
    updated_at: data.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requester_name: (data as any).requester?.display_name ?? "Unknown",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reviewer_name: (data as any).reviewer?.display_name ?? null,
  };
}

export async function getPendingApprovalCount(
  orgId?: string
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("approvals")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { count, error } = await query;

  if (error) return 0;
  return count ?? 0;
}

export async function createApproval(data: {
  bundle_id: string;
  bundle_version_id: string;
  requested_by: string;
  discount_pct: number;
  margin_pct: number | null;
  mrr: number | null;
  seat_count: number | null;
  bundle_name: string;
  version_number: number;
  notes: string;
  org_id: string;
}): Promise<Approval> {
  const supabase = await createClient();
  const { data: approval, error } = await supabase
    .from("approvals")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return approval as Approval;
}

export async function reviewApproval(
  id: string,
  reviewerId: string,
  status: "approved" | "rejected",
  review_notes: string
): Promise<Approval> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approvals")
    .update({
      status,
      reviewer_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Approval;
}
