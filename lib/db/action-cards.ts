import { createClient } from "@/lib/supabase/server";
import type { AIActionCard } from "@/lib/types";

export async function getActiveActionCards(
  orgId: string,
  entityId: string
): Promise<AIActionCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_action_cards")
    .select("*")
    .eq("org_id", orgId)
    .eq("entity_id", entityId)
    .is("dismissed_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("severity", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as AIActionCard[]) ?? [];
}

/**
 * Get all active action cards for an org (dashboard view).
 * Filters: dismissed_at IS NULL, snoozed_until passed or null, not expired.
 * Sorted: critical first, then by created_at desc. Capped at 5.
 */
export async function getOrgActionCards(
  orgId: string
): Promise<AIActionCard[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ai_action_cards")
    .select("*")
    .eq("org_id", orgId)
    .is("dismissed_at", null)
    .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("severity", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;
  return (data as AIActionCard[]) ?? [];
}

export async function dismissActionCard(cardId: string): Promise<void> {
  const supabase = await createClient();
  const snoozedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("ai_action_cards")
    .update({
      dismissed_at: new Date().toISOString(),
      snoozed_until: snoozedUntil,
    })
    .eq("id", cardId);

  if (error) throw error;
}
