import { createServiceClient } from "@/lib/supabase/service";
import { computeOrgSignals } from "@/lib/intelligence/signal-engine";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const { data: orgs, error } = await service
      .from("orgs")
      .select("id, name");

    if (error) throw error;
    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: "No orgs found", results: [] });
    }

    const results = [];
    for (const org of orgs) {
      try {
        await computeOrgSignals(org.id);
        results.push({ org_id: org.id, status: "ok" });
      } catch (err) {
        results.push({
          org_id: org.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${orgs.length} orgs`,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
