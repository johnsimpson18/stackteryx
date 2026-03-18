import { createServiceClient } from "@/lib/supabase/service";
import { logAgentActivity } from "@/lib/agents/log-activity";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// Runs daily at 9am UTC — catches trials that expired overnight
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const service = createServiceClient();

    // Find expired trials that haven't converted to paid
    const { data: expiredTrials } = await service
      .from("subscriptions")
      .select("id, org_id, trial_ends_at")
      .eq("plan", "trial")
      .lt("trial_ends_at", new Date().toISOString())
      .is("stripe_subscription_id", null); // not converted to paid

    let downgraded = 0;

    for (const sub of expiredTrials ?? []) {
      // Downgrade to free
      await service
        .from("subscriptions")
        .update({
          plan: "free",
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      // Log Scout activity
      logAgentActivity({
        orgId: sub.org_id,
        agentId: "scout",
        activityType: "alert",
        title: "Trial ended — account moved to free plan",
        description:
          "Free trial expired. Upgrade to Pro to restore full access.",
      });

      // Create win-back nudge
      const { count: serviceCount } = await service
        .from("bundles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", sub.org_id);

      const { count: clientCount } = await service
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("org_id", sub.org_id);

      const svcN = serviceCount ?? 0;
      const cliN = clientCount ?? 0;

      await service.from("scout_nudges").insert({
        org_id: sub.org_id,
        nudge_type: "trial_expired",
        priority: 1,
        title: "Your trial ended — your work is waiting",
        body:
          svcN > 0 || cliN > 0
            ? `You built ${svcN} service${svcN !== 1 ? "s" : ""} and added ${cliN} client${cliN !== 1 ? "s" : ""} during your trial. Upgrade to Pro to keep building where you left off.`
            : "Upgrade to Pro to restore full access to Stackteryx.",
        entity_type: "portfolio",
        cta_label: "Restore full access",
        cta_href: "/settings",
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });

      downgraded++;
    }

    return NextResponse.json({
      processed: expiredTrials?.length ?? 0,
      downgraded,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
