import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type Stripe from "stripe";

// Register this webhook endpoint in Stripe Dashboard:
//   URL: https://[your-domain]/api/webhooks/stripe
//   Events: checkout.session.completed, customer.subscription.created,
//           customer.subscription.updated, customer.subscription.deleted,
//           invoice.payment_failed, customer.subscription.trial_will_end

/** Resolve a Stripe price ID to a plan name. */
function planFromPriceId(priceId: string | undefined): "free" | "pro" | "enterprise" {
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "enterprise";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

/** Extract and upsert subscription details from a Stripe Subscription object. */
async function syncSubscriptionFromStripe(
  sub: Stripe.Subscription,
  service: ReturnType<typeof createServiceClient>,
) {
  const firstItem = sub.items.data[0];
  const currentPriceId = firstItem?.price?.id;
  const plan = planFromPriceId(currentPriceId);

  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  await service
    .from("subscriptions")
    .update({
      status:
        sub.status === "active"
          ? "active"
          : sub.status === "past_due"
            ? "past_due"
            : sub.status,
      plan,
      stripe_customer_id: customerId ?? null,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      if (!orgId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      // Retrieve the full subscription to get plan + period dates
      let plan: "pro" | "enterprise" = "pro";
      let periodStart: string | null = null;
      let periodEnd: string | null = null;
      if (subscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id;
        const detected = planFromPriceId(priceId);
        if (detected === "pro" || detected === "enterprise") {
          plan = detected;
        }
        if (firstItem?.current_period_start) {
          periodStart = new Date(firstItem.current_period_start * 1000).toISOString();
        }
        if (firstItem?.current_period_end) {
          periodEnd = new Date(firstItem.current_period_end * 1000).toISOString();
        }
      }

      await service
        .from("subscriptions")
        .upsert(
          {
            org_id: orgId,
            plan,
            status: "active",
            stripe_subscription_id: subscriptionId ?? null,
            stripe_customer_id: customerId ?? null,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            trial_converted: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "org_id" },
        );

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(sub, service);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await service
        .from("subscriptions")
        .update({
          plan: "free",
          status: "canceled",
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        await service
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
      }

      break;
    }

    case "customer.subscription.trial_will_end": {
      // Fires ~3 days before trial ends — create a Scout nudge
      const sub = event.data.object as Stripe.Subscription;
      const trialCustomerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

      if (!trialCustomerId) break;

      // Look up org from Stripe customer ID
      const { data: orgSub } = await service
        .from("subscriptions")
        .select("org_id")
        .eq("stripe_customer_id", trialCustomerId)
        .single();

      if (!orgSub?.org_id) break;

      // Create high-priority Scout nudge
      await service.from("scout_nudges").insert({
        org_id: orgSub.org_id,
        nudge_type: "trial_expiring",
        priority: 1,
        title: "Your Free Trial ends in 3 days",
        body:
          "Upgrade to Pro to keep your services, clients, and AI generations. " +
          "Everything you've built stays exactly as-is.",
        entity_type: "subscription",
        entity_name: "Free Trial",
        status: "active",
      });

      break;
    }
  }

  return NextResponse.json({ received: true });
}
