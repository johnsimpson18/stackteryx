"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/db/profiles";
import { getActiveOrgId } from "@/lib/org-context";
import { createBundle } from "@/lib/db/bundles";
import { upsertServiceOutcome } from "@/lib/db/service-outcomes";
import { FRACTIONAL_CTO_TEMPLATE } from "@/lib/fractional-cto-template";

export async function addFractionalCTOService(): Promise<
  { serviceId: string } | { error: "ALREADY_EXISTS" | string }
> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active organization");

  // Check for duplicates — match by name or outcome_type "advisory"
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("bundles")
    .select("id, name")
    .eq("org_id", orgId)
    .ilike("name", "%Fractional CTO%")
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "ALREADY_EXISTS" };
  }

  const tmpl = FRACTIONAL_CTO_TEMPLATE;

  // 1. Create the bundle (service record)
  const bundle = await createBundle({
    name: tmpl.name,
    bundle_type: "custom",
    description: tmpl.description,
    created_by: profile.id,
    org_id: orgId,
  });

  // 2. Mark outcome layer complete
  await supabase
    .from("bundles")
    .update({
      wizard_step_completed: 1,
      outcome_layer_complete: true,
      wizard_in_progress: false,
    })
    .eq("id", bundle.id);

  // 3. Create the service outcome with deliverables as capabilities
  const outcomeStatement = tmpl.outcomes
    .map((o) => `${o.title}: ${o.description}`)
    .join("\n\n");

  const serviceCapabilities = tmpl.deliverables.map((d) => ({
    name: `${d.name} (${d.cadence})`,
    description: d.description,
    met_by_tools: [] as string[],
  }));

  await upsertServiceOutcome(orgId, bundle.id, {
    outcome_type: "growth",
    outcome_statement: outcomeStatement,
    target_vertical: "All Industries",
    target_persona: "Business Owner / Executive Leadership",
    service_capabilities: serviceCapabilities,
  });

  return { serviceId: bundle.id };
}
