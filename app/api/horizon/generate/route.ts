import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/org-context";
import { generateHorizonDigest } from "@/actions/horizon";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 60;

export async function POST() {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No active org" }, { status: 400 });
  }

  // Rate limit: once per hour per org
  const service = createServiceClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent } = await service
    .from("horizon_digests")
    .select("id")
    .eq("org_id", orgId)
    .gte("generated_at", oneHourAgo)
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { error: "Rate limited — digest was generated within the last hour" },
      { status: 429 },
    );
  }

  try {
    const digest = await generateHorizonDigest(orgId);
    return NextResponse.json({ digest });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate digest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
