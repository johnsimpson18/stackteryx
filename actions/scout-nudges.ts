"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getActiveOrgId } from "@/lib/org-context";
import { generateScoutNudges, type ScoutNudge } from "@/lib/intelligence/scout-nudges";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScoutNudgeRecord {
  id: string;
  orgId: string;
  nudgeType: string;
  priority: number;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  status: string;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toRecord(row: Record<string, unknown>): ScoutNudgeRecord {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    nudgeType: row.nudge_type as string,
    priority: (row.priority as number) ?? 5,
    title: row.title as string,
    body: row.body as string,
    entityType: (row.entity_type as string) ?? null,
    entityId: (row.entity_id as string) ?? null,
    entityName: (row.entity_name as string) ?? null,
    ctaLabel: (row.cta_label as string) ?? null,
    ctaHref: (row.cta_href as string) ?? null,
    status: (row.status as string) ?? "active",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getActiveNudges(): Promise<ScoutNudgeRecord[]> {
  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  const service = createServiceClient();
  const { data } = await service
    .from("scout_nudges")
    .select("*")
    .eq("org_id", orgId)
    .eq("status", "active")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  return (data ?? []).map(toRecord);
}

export async function dismissNudge(nudgeId: string): Promise<void> {
  const orgId = await getActiveOrgId();
  if (!orgId) return;

  const service = createServiceClient();
  await service
    .from("scout_nudges")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", nudgeId)
    .eq("org_id", orgId);
}

export async function markNudgeActed(nudgeId: string): Promise<void> {
  const orgId = await getActiveOrgId();
  if (!orgId) return;

  const service = createServiceClient();
  await service
    .from("scout_nudges")
    .update({
      status: "acted",
      acted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", nudgeId)
    .eq("org_id", orgId);
}

export async function refreshNudges(): Promise<ScoutNudgeRecord[]> {
  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  await syncNudgesToDb(orgId);
  return getActiveNudges();
}

/** Generate nudges and sync them to the database, deduplicating by type+entity. */
export async function syncNudgesToDb(orgId: string): Promise<void> {
  const service = createServiceClient();
  const nudges = await generateScoutNudges(orgId);

  // Get existing active nudges for deduplication
  const { data: existing } = await service
    .from("scout_nudges")
    .select("id, nudge_type, entity_id, entity_type")
    .eq("org_id", orgId)
    .eq("status", "active");

  const existingKeys = new Set(
    (existing ?? []).map(
      (n) => `${n.nudge_type}:${n.entity_type ?? ""}:${n.entity_id ?? ""}`,
    ),
  );

  // Find existing nudges to update (refresh updated_at)
  const existingMap = new Map(
    (existing ?? []).map((n) => [
      `${n.nudge_type}:${n.entity_type ?? ""}:${n.entity_id ?? ""}`,
      n.id,
    ]),
  );

  for (const nudge of nudges) {
    const key = `${nudge.nudgeType}:${nudge.entityType ?? ""}:${nudge.entityId ?? ""}`;

    if (existingKeys.has(key)) {
      // Update existing nudge
      const existingId = existingMap.get(key);
      if (existingId) {
        await service
          .from("scout_nudges")
          .update({
            title: nudge.title,
            body: nudge.body,
            priority: nudge.priority,
            cta_label: nudge.ctaLabel,
            cta_href: nudge.ctaHref,
            expires_at: nudge.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
      }
    } else {
      // Insert new nudge
      await service.from("scout_nudges").insert({
        org_id: orgId,
        nudge_type: nudge.nudgeType,
        priority: nudge.priority,
        title: nudge.title,
        body: nudge.body,
        entity_type: nudge.entityType,
        entity_id: nudge.entityId,
        entity_name: nudge.entityName,
        cta_label: nudge.ctaLabel,
        cta_href: nudge.ctaHref,
        expires_at: nudge.expiresAt,
      });
    }
  }

  // Expire nudges that are no longer generated (stale nudges)
  const newKeys = new Set(
    nudges.map(
      (n) => `${n.nudgeType}:${n.entityType ?? ""}:${n.entityId ?? ""}`,
    ),
  );

  for (const e of existing ?? []) {
    const key = `${e.nudge_type}:${e.entity_type ?? ""}:${e.entity_id ?? ""}`;
    if (!newKeys.has(key)) {
      await service
        .from("scout_nudges")
        .update({
          status: "dismissed",
          dismissed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", e.id);
    }
  }

  // Log Scout activity
  if (nudges.length > 0) {
    import("@/lib/agents/log-activity").then(({ logAgentActivity }) => {
      logAgentActivity({
        orgId,
        agentId: "scout",
        activityType: "detection",
        title: `Scout identified ${nudges.length} portfolio signal${nudges.length !== 1 ? "s" : ""}`,
      });
    });
  }
}
