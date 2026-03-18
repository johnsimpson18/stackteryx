import { createServiceClient } from "@/lib/supabase/service";
import { generateHorizonDigest } from "@/actions/horizon";
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutes — web search + generation

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const { data: orgs, error } = await service
      .from("orgs")
      .select("id, name");

    if (error) throw error;
    if (!orgs || orgs.length === 0) {
      return NextResponse.json({ message: "No orgs found", generated: 0 });
    }

    // Get current week start
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    const weekStart = monday.toISOString().split("T")[0];

    let generated = 0;

    for (const org of orgs) {
      try {
        // Check if digest already exists for this week
        const { data: existing } = await service
          .from("horizon_digests")
          .select("id")
          .eq("org_id", org.id)
          .eq("week_start", weekStart)
          .single();

        if (existing) continue; // Skip — already generated

        await generateHorizonDigest(org.id);
        generated++;

        // Rate limit: 2 second delay between orgs
        if (generated < orgs.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err) {
        // Log but continue with other orgs
        console.error(
          `Horizon digest failed for org ${org.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return NextResponse.json({
      message: `Generated ${generated} digests`,
      generated,
      week: weekStart,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
