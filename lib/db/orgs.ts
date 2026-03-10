import { createClient } from "@/lib/supabase/server";
import type { Org } from "@/lib/types";

export async function getOrgById(id: string): Promise<Org | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orgs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Org;
}

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orgs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Org;
}

export async function getUserOrgs(userId: string): Promise<Org[]> {
  const supabase = await createClient();
  const { data: memberships, error: memError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId);

  if (memError || !memberships || memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.org_id);
  const { data, error } = await supabase
    .from("orgs")
    .select("*")
    .in("id", orgIds)
    .order("name");

  if (error) throw error;
  return (data as Org[]) ?? [];
}

export async function createOrg(data: {
  name: string;
  slug: string;
  created_by: string;
}): Promise<Org> {
  const supabase = await createClient();
  const { data: org, error } = await supabase
    .from("orgs")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return org as Org;
}

export async function updateOrg(
  id: string,
  data: Partial<Pick<Org, "name" | "slug" | "org_outcome_targets">>
): Promise<Org> {
  const supabase = await createClient();
  const { data: org, error } = await supabase
    .from("orgs")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return org as Org;
}
