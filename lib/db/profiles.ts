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

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");

  if (error) throw error;
  return (data as Profile[]) ?? [];
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
