import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function getProfiles(orgId: string): Promise<Profile[]> {
  const supabase = await createClient();
  // TODO: implement cursor pagination when org data exceeds these limits
  const { data, error } = await supabase
    .from("org_members")
    .select("profiles(*)")
    .eq("org_id", orgId)
    .order("created_at", { referencedTable: "profiles" })
    .limit(100);

  if (error) throw error;
  return (
    (data ?? [])
      .map((row) => (row.profiles as unknown) as Profile)
      .filter(Boolean)
  );
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Profile;
}

export async function updateProfile(
  id: string,
  data: Partial<Pick<Profile, "display_name" | "role" | "is_active" | "active_org_id">>
): Promise<Profile> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return profile as Profile;
}

export async function updateProfileRole(
  id: string,
  role: UserRole
): Promise<Profile> {
  return updateProfile(id, { role });
}
