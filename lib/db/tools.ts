import { createClient } from "@/lib/supabase/server";
import type { Tool, ToolCategory, PricingModel } from "@/lib/types";

export interface ToolFilters {
  search?: string;
  category?: ToolCategory;
  pricing_model?: PricingModel;
  is_active?: boolean;
}

export async function getTools(
  orgId?: string,
  filters?: ToolFilters
): Promise<Tool[]> {
  const supabase = await createClient();
  let query = supabase.from("tools").select("*").order("name");

  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.pricing_model) {
    query = query.eq("pricing_model", filters.pricing_model);
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,vendor.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data as Tool[]) ?? [];
}

export async function getToolById(id: string): Promise<Tool | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Tool;
}

export async function createTool(
  data: Omit<Tool, "id" | "created_at" | "updated_at" | "is_active">
): Promise<Tool> {
  const supabase = await createClient();
  const { data: tool, error } = await supabase
    .from("tools")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return tool as Tool;
}

export async function updateTool(
  id: string,
  data: Partial<Omit<Tool, "id" | "org_id" | "created_at" | "updated_at">>
): Promise<Tool> {
  const supabase = await createClient();
  const { data: tool, error } = await supabase
    .from("tools")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return tool as Tool;
}

export async function deactivateTool(id: string): Promise<Tool> {
  return updateTool(id, { is_active: false });
}
