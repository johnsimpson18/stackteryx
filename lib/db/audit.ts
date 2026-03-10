import { createClient } from "@/lib/supabase/server";
import type { AuditAction } from "@/lib/types";

export async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
  orgId?: string | null
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ...(orgId && { org_id: orgId }),
  });
}
