"use server";

import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/org-context";
import { getCurrentProfile } from "@/lib/db/profiles";
import {
  PLAN_LIMITS,
  isBypassMode,
  type Plan,
  type LimitKey,
  type PlanLimitValues,
} from "@/lib/plans";

async function getAuthEmail(): Promise<string | undefined> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email;
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface SubscriptionRecord {
  orgId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  comped: boolean;
  compedBy: string | null;
  compedReason: string | null;
  compedExpiresAt: string | null;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  trialConverted: boolean;
}

export interface UsageRecord {
  aiGenerationsCount: number;
  exportsCount: number;
  periodMonth: string;
}

export interface LimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: Plan;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function currentPeriodMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function requireOrgId(): Promise<string> {
  const orgId = await getActiveOrgId();
  if (!orgId) throw new Error("No active org");
  return orgId;
}

/** Resolve a price ID to a plan name. */
function planFromPriceId(priceId: string | undefined): Plan {
  if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) return "enterprise";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  return "free";
}

/** Check if a limit key is a boolean feature flag (not a numeric usage cap). */
function isFeatureFlag(key: LimitKey): boolean {
  return typeof PLAN_LIMITS.free[key] === "boolean";
}

// ── Subscription ────────────────────────────────────────────────────────────

export async function getOrgSubscription(): Promise<SubscriptionRecord> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data, error } = await service
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error || !data) {
    // New org — start on 7-day trial with full Pro access
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: created, error: insertErr } = await service
      .from("subscriptions")
      .insert({
        org_id: orgId,
        plan: "trial",
        status: "active",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnd.toISOString(),
      })
      .select()
      .single();

    if (insertErr || !created) {
      throw new Error("Failed to initialize subscription");
    }

    return {
      orgId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      plan: "trial" as Plan,
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      comped: false,
      compedBy: null,
      compedReason: null,
      compedExpiresAt: null,
      trialEndsAt: trialEnd.toISOString(),
      trialStartedAt: now.toISOString(),
      trialConverted: false,
    };
  }

  return {
    orgId,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    plan: data.plan as Plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    comped: data.comped ?? false,
    compedBy: data.comped_by ?? null,
    compedReason: data.comped_reason ?? null,
    compedExpiresAt: data.comped_expires_at ?? null,
    trialEndsAt: data.trial_ends_at ?? null,
    trialStartedAt: data.trial_started_at ?? null,
    trialConverted: data.trial_converted ?? false,
  };
}

// ── Stripe ↔ DB Reconciliation ───────────────────────────────────────────────

/**
 * Reconcile the local subscription record with the source of truth in Stripe.
 * Call this when loading billing UI to self-heal missed webhooks.
 */
export async function syncSubscriptionWithStripe(): Promise<SubscriptionRecord> {
  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .single();

  // If comped, the subscription is managed outside Stripe — skip sync
  if (sub?.comped) {
    return buildSubscriptionRecord(orgId, sub);
  }

  const stripeSubId = sub?.stripe_subscription_id;
  if (!stripeSubId) {
    // No Stripe subscription linked — nothing to reconcile
    return getOrgSubscription();
  }

  // Fetch the authoritative state from Stripe
  const stripeSub = await getStripe().subscriptions.retrieve(stripeSubId);

  const firstItem = stripeSub.items.data[0];
  const priceId = firstItem?.price?.id;
  const plan = planFromPriceId(priceId);
  const periodStart = firstItem?.current_period_start;
  const periodEnd = firstItem?.current_period_end;

  const status =
    stripeSub.status === "active"
      ? "active"
      : stripeSub.status === "past_due"
        ? "past_due"
        : stripeSub.status === "canceled"
          ? "canceled"
          : stripeSub.status;

  const { data: updated } = await service
    .from("subscriptions")
    .update({
      plan,
      status,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .select()
    .single();

  return buildSubscriptionRecord(orgId, updated ?? sub);
}

function buildSubscriptionRecord(
  orgId: string,
  data: Record<string, unknown>,
): SubscriptionRecord {
  return {
    orgId,
    stripeCustomerId: (data.stripe_customer_id as string) ?? null,
    stripeSubscriptionId: (data.stripe_subscription_id as string) ?? null,
    plan: (data.plan as Plan) ?? "free",
    status: (data.status as string) ?? "active",
    currentPeriodEnd: (data.current_period_end as string) ?? null,
    cancelAtPeriodEnd: (data.cancel_at_period_end as boolean) ?? false,
    comped: (data.comped as boolean) ?? false,
    trialEndsAt: (data.trial_ends_at as string) ?? null,
    trialStartedAt: (data.trial_started_at as string) ?? null,
    trialConverted: (data.trial_converted as boolean) ?? false,
    compedBy: (data.comped_by as string) ?? null,
    compedReason: (data.comped_reason as string) ?? null,
    compedExpiresAt: (data.comped_expires_at as string) ?? null,
  };
}

// ── Usage ───────────────────────────────────────────────────────────────────

export async function getOrgUsage(): Promise<UsageRecord> {
  const orgId = await requireOrgId();
  const service = createServiceClient();
  const month = currentPeriodMonth();

  const { data } = await service
    .from("usage_tracking")
    .select("*")
    .eq("org_id", orgId)
    .eq("period_month", month)
    .single();

  return {
    aiGenerationsCount: data?.ai_generations_count ?? 0,
    exportsCount: data?.exports_count ?? 0,
    periodMonth: month,
  };
}

export async function incrementUsage(
  type: "ai_generation" | "export",
): Promise<void> {
  const orgId = await requireOrgId();
  const service = createServiceClient();
  const month = currentPeriodMonth();

  const column =
    type === "ai_generation" ? "ai_generations_count" : "exports_count";

  const { data: existing } = await service
    .from("usage_tracking")
    .select("id, ai_generations_count, exports_count")
    .eq("org_id", orgId)
    .eq("period_month", month)
    .single();

  if (existing) {
    const currentVal =
      type === "ai_generation"
        ? existing.ai_generations_count
        : existing.exports_count;
    await service
      .from("usage_tracking")
      .update({
        [column]: ((currentVal as number) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await service.from("usage_tracking").insert({
      org_id: orgId,
      period_month: month,
      [column]: 1,
    });
  }
}

// ── Limit Checking ──────────────────────────────────────────────────────────

export async function checkLimit(limitKey: LimitKey): Promise<LimitCheck> {
  // Developer bypass — never active in production
  if (isBypassMode()) {
    return { allowed: true, current: 0, limit: Infinity, plan: "pro" };
  }

  const orgId = await requireOrgId();
  const service = createServiceClient();

  // Get subscription (including comp + trial fields)
  const { data: sub } = await service
    .from("subscriptions")
    .select("plan, comped, comped_expires_at, trial_ends_at")
    .eq("org_id", orgId)
    .single();

  let plan: Plan = (sub?.plan as Plan) ?? "free";

  // Trial check — active trial gets full Pro access
  if (plan === "trial") {
    const trialEndsAt = sub?.trial_ends_at;
    if (trialEndsAt && new Date(trialEndsAt) > new Date()) {
      // Active trial — unlimited access
      return { allowed: true, current: 0, limit: Infinity, plan: "trial" };
    }
    // Trial expired — fallback downgrade to free (cron is primary mechanism)
    await downgradeToFree(orgId);
    plan = "free";
  }

  // Comp check — if comped and expired, downgrade to free
  if (sub?.comped) {
    const expiresAt = sub.comped_expires_at;
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      await service
        .from("subscriptions")
        .update({
          comped: false,
          plan: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
      plan = "free";
    }
    // Otherwise plan stays as whatever was set by the comp
  }

  const planLimits = PLAN_LIMITS[plan] as PlanLimitValues;

  // Boolean feature flags — just check if the plan has the feature
  if (isFeatureFlag(limitKey)) {
    const allowed = planLimits[limitKey] as boolean;
    return { allowed, current: 0, limit: allowed ? 1 : 0, plan };
  }

  const limit = planLimits[limitKey] as number;

  // Infinite limits — always allowed
  if (limit === Infinity) {
    return { allowed: true, current: 0, limit: Infinity, plan };
  }

  let current = 0;

  switch (limitKey) {
    case "services": {
      const { count } = await service
        .from("bundles")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      current = count ?? 0;
      break;
    }
    case "clients": {
      const { count } = await service
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      current = count ?? 0;
      break;
    }
    case "teamMembers": {
      const { count } = await service
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);
      current = count ?? 0;
      break;
    }
    case "aiGenerationsPerMonth": {
      const month = currentPeriodMonth();
      const { data } = await service
        .from("usage_tracking")
        .select("ai_generations_count")
        .eq("org_id", orgId)
        .eq("period_month", month)
        .single();
      current = data?.ai_generations_count ?? 0;
      break;
    }
    case "exportsPerMonth": {
      const month = currentPeriodMonth();
      const { data } = await service
        .from("usage_tracking")
        .select("exports_count")
        .eq("org_id", orgId)
        .eq("period_month", month)
        .single();
      current = data?.exports_count ?? 0;
      break;
    }
    case "ctoBriefsTotalEver": {
      if (plan === "pro") {
        // Pro: monthly cap — count briefs created this month
        const month = currentPeriodMonth();
        const startOfMonth = `${month}-01T00:00:00.000Z`;
        const { count } = await service
          .from("fractional_cto_briefs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId)
          .gte("created_at", startOfMonth);
        current = count ?? 0;
      } else {
        // Free: lifetime cap
        const { count } = await service
          .from("fractional_cto_briefs")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId);
        current = count ?? 0;
      }
      break;
    }
  }

  return { allowed: current < limit, current, limit, plan };
}

// ── Stripe Checkout ─────────────────────────────────────────────────────────

export async function createCheckoutSession(
  targetPlan: "pro" | "enterprise" = "pro",
): Promise<{ url: string }> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("stripe_customer_id, plan, trial_ends_at")
    .eq("org_id", orgId)
    .single();

  const priceId =
    targetPlan === "enterprise"
      ? process.env.STRIPE_ENTERPRISE_PRICE_ID!
      : process.env.STRIPE_PRO_PRICE_ID!;

  // If user is in an active trial, set Stripe trial_end to match
  // so they aren't charged until the trial period ends
  const trialEndsAt = sub?.trial_ends_at;
  const isInTrial =
    sub?.plan === "trial" &&
    trialEndsAt &&
    new Date(trialEndsAt) > new Date();

  const sessionParams: Record<string, unknown> = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
    metadata: { org_id: orgId },
    allow_promotion_codes: true,
    ...(isInTrial
      ? {
          subscription_data: {
            trial_end: Math.floor(
              new Date(trialEndsAt).getTime() / 1000,
            ),
          },
        }
      : {}),
  };

  if (sub?.stripe_customer_id) {
    sessionParams.customer = sub.stripe_customer_id;
  } else {
    const email = await getAuthEmail();
    if (email) sessionParams.customer_email = email;
  }

  let sessionUrl: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getStripe().checkout.sessions.create(sessionParams as any);
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    sessionUrl = session.url;
  } catch (err) {
    console.error("[STRIPE] checkout.sessions.create failed:", err);
    throw new Error("Stripe checkout unavailable. Please try again.");
  }

  return { url: sessionUrl };
}

export async function downgradeToFree(orgId: string): Promise<void> {
  const service = createServiceClient();
  await service
    .from("subscriptions")
    .update({
      plan: "free",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);
}

export async function createBillingPortalSession(): Promise<
  { url: string } | { error: "NO_BILLING_ACCOUNT"; message: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Not authenticated");

  const orgId = await requireOrgId();
  const service = createServiceClient();

  const { data: sub } = await service
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", orgId)
    .single();

  if (!sub?.stripe_customer_id) {
    return {
      error: "NO_BILLING_ACCOUNT",
      message: "Upgrade to Pro to access billing management.",
    };
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings`,
  });

  return { url: session.url };
}

// ── Comp Management (admin only) ────────────────────────────────────────────

export async function grantCompAccess(input: {
  orgId: string;
  plan: "pro" | "enterprise";
  compedBy: string;
  compedReason: string;
  compedExpiresAt: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") {
    return { success: false, error: "Unauthorized" };
  }

  const service = createServiceClient();

  const { error } = await service
    .from("subscriptions")
    .update({
      plan: input.plan,
      comped: true,
      comped_by: input.compedBy,
      comped_reason: input.compedReason,
      comped_expires_at: input.compedExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", input.orgId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function revokeCompAccess(
  orgId: string,
): Promise<{ success: boolean; error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") {
    return { success: false, error: "Unauthorized" };
  }

  const service = createServiceClient();

  const { error } = await service
    .from("subscriptions")
    .update({
      plan: "free",
      comped: false,
      comped_by: null,
      comped_reason: null,
      comped_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getCompedOrgs(): Promise<
  {
    orgId: string;
    orgName: string;
    plan: Plan;
    compedBy: string | null;
    compedReason: string | null;
    compedExpiresAt: string | null;
  }[]
> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") return [];

  const service = createServiceClient();

  const { data } = await service
    .from("subscriptions")
    .select("org_id, plan, comped_by, comped_reason, comped_expires_at")
    .eq("comped", true);

  if (!data || data.length === 0) return [];

  const orgIds = data.map((d) => d.org_id);
  const { data: orgs } = await service
    .from("orgs")
    .select("id, name")
    .in("id", orgIds);

  const orgMap = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return data.map((d) => ({
    orgId: d.org_id,
    orgName: orgMap.get(d.org_id) ?? "Unknown",
    plan: d.plan as Plan,
    compedBy: d.comped_by,
    compedReason: d.comped_reason,
    compedExpiresAt: d.comped_expires_at,
  }));
}

export async function searchOrgs(
  query: string,
): Promise<{ id: string; name: string }[]> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "owner") return [];

  const service = createServiceClient();

  const { data } = await service
    .from("orgs")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .limit(10);

  return data ?? [];
}
