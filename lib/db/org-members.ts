import { createClient } from "@/lib/supabase/server";
import type { OrgMember, OrgMemberWithProfile, OrgRole } from "@/lib/types";

export async function getOrgMembers(
  orgId: string
): Promise<OrgMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select(`
      *,
      profile:profiles!org_members_user_id_fkey(display_name, is_active)
    `)
    .eq("org_id", orgId)
    .order("created_at");

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    org_id: row.org_id,
    user_id: row.user_id,
    role: row.role as OrgRole,
    invited_by: row.invited_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    display_name: (row as any).profile?.display_name ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    is_active: (row as any).profile?.is_active ?? true,
  }));
}

export async function getUserOrgMemberships(
  userId: string
): Promise<{ org_id: string; org_name: string; role: OrgRole }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select(`
      org_id,
      role,
      org:orgs!org_members_org_id_fkey(name)
    `)
    .eq("user_id", userId);

  if (error) throw error;
  if (!data) return [];

  return data.map((row) => ({
    org_id: row.org_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    org_name: (row as any).org?.name ?? "Unknown",
    role: row.role as OrgRole,
  }));
}

export async function getOrgMember(
  orgId: string,
  userId: string
): Promise<OrgMember | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as OrgMember;
}

export async function getOrgMemberCount(orgId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  if (error) throw error;
  return count ?? 0;
}

export async function addOrgMember(data: {
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string;
}): Promise<OrgMember> {
  const supabase = await createClient();
  const { data: member, error } = await supabase
    .from("org_members")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return member as OrgMember;
}

export async function updateOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgRole
): Promise<OrgMember> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as OrgMember;
}

export async function removeOrgMember(
  orgId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (error) throw error;
}
