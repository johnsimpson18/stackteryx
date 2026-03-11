import { createClient } from "@/lib/supabase/server";
import { runDailyIntelligence } from "@/lib/ai/intelligence";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  // Only allow requests with valid CRON_SECRET — no user auth fallback
  const cronSecret = request.headers.get("x-cron-secret");
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all orgs
    const supabase = await createClient();
    const { data: orgs, error } = await supabase
      .from("orgs")
      .select("id, name");

    if (error) throw error;
    if (!orgs || orgs.length === 0) {
      return Response.json({ message: "No orgs found", results: [] });
    }

    const results = [];
    for (const org of orgs) {
      try {
        const result = await runDailyIntelligence(org.id);
        results.push({ org_id: org.id, org_name: org.name, ...result });
      } catch (err) {
        results.push({
          org_id: org.id,
          org_name: org.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return Response.json({
      message: `Processed ${orgs.length} orgs`,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron job failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
