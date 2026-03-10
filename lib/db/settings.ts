import { createClient } from "@/lib/supabase/server";
import type { WorkspaceSettings } from "@/lib/types";

/** @deprecated Use {@link getOrgSettings} from `lib/db/org-settings.ts` instead. */
export async function getWorkspaceSettings(
  orgId?: string
): Promise<WorkspaceSettings | null> {
  const supabase = await createClient();
  let query = supabase.from("workspace_settings").select("*");

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as WorkspaceSettings;
}

/** @deprecated Use {@link upsertOrgSettings} from `lib/db/org-settings.ts` instead. */
export async function updateWorkspaceSettings(
  id: string,
  data: Partial<
    Omit<WorkspaceSettings, "id" | "org_id" | "created_at" | "updated_at">
  >
): Promise<WorkspaceSettings> {
  const supabase = await createClient();
  const { data: settings, error } = await supabase
    .from("workspace_settings")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return settings as WorkspaceSettings;
}
