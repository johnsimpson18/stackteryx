import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logAgentActivity } from "@/lib/agents/log-activity";

/**
 * Scout analysis endpoint.
 * Called when portfolio-relevant events happen (new client, service launched).
 * POST { orgId, trigger: 'new_client' | 'service_launched', entityId, entityName }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, trigger, entityId, entityName } = body as {
      orgId: string;
      trigger: "new_client" | "service_launched";
      entityId?: string;
      entityName?: string;
    };

    if (!orgId || !trigger) {
      return NextResponse.json(
        { error: "orgId and trigger are required" },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    if (trigger === "new_client") {
      // Scout analyzes the portfolio for upsell signals related to the new client
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name, industry")
        .eq("org_id", orgId)
        .eq("status", "active");

      const clientCount = clients?.length ?? 0;

      logAgentActivity({
        orgId,
        agentId: "scout",
        activityType: "analysis",
        title: `Scout analyzed portfolio after new client ${entityName ?? "added"}`,
        description: `Portfolio now has ${clientCount} active clients. Checking for upsell opportunities.`,
        entityType: "client",
        entityId,
        entityName,
      });

      // Check if existing services could benefit this client's industry
      if (entityName) {
        const { data: client } = await supabase
          .from("clients")
          .select("industry")
          .eq("id", entityId ?? "")
          .single();

        if (client?.industry) {
          const { data: bundles } = await supabase
            .from("bundles")
            .select("id, name")
            .eq("org_id", orgId)
            .eq("status", "active");

          if (bundles && bundles.length > 0) {
            logAgentActivity({
              orgId,
              agentId: "scout",
              activityType: "detection",
              title: `Scout identified ${bundles.length} services for ${entityName}`,
              description: `${entityName} (${client.industry}) may benefit from existing service offerings.`,
              entityType: "client",
              entityId,
              entityName,
            });
          }
        }
      }
    }

    if (trigger === "service_launched") {
      // Scout checks which existing clients might benefit from the new service
      const { data: clients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("org_id", orgId)
        .eq("status", "active");

      const clientCount = clients?.length ?? 0;

      logAgentActivity({
        orgId,
        agentId: "scout",
        activityType: "detection",
        title: `Scout scanning ${clientCount} clients for ${entityName ?? "new service"} fit`,
        description: `New service launched — checking which existing clients could benefit.`,
        entityType: "service",
        entityId,
        entityName,
      });

      // Log individual signals for clients without active contracts to this service
      if (clients && clients.length > 0) {
        const { data: contracts } = await supabase
          .from("client_contracts")
          .select("client_id, bundle_id")
          .eq("bundle_id", entityId ?? "")
          .eq("status", "active");

        const contractedClientIds = new Set(
          (contracts ?? []).map((c) => c.client_id),
        );

        const prospects = clients.filter(
          (c) => !contractedClientIds.has(c.id),
        );

        if (prospects.length > 0) {
          logAgentActivity({
            orgId,
            agentId: "scout",
            activityType: "detection",
            title: `Scout found ${prospects.length} clients who could benefit from ${entityName ?? "the new service"}`,
            description: prospects
              .slice(0, 3)
              .map((c) => c.name)
              .join(", ") +
              (prospects.length > 3
                ? ` and ${prospects.length - 3} more`
                : ""),
            entityType: "service",
            entityId,
            entityName,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Scout analysis failed" },
      { status: 500 },
    );
  }
}
