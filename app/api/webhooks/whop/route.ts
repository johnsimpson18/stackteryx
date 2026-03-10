import { NextResponse } from "next/server";

// TODO: Phase 4 — Implement Whop webhook processing
// This endpoint will handle:
// - membership.went_valid
// - membership.went_invalid
// - membership.went_expired
// - payment.succeeded
// - payment.failed
//
// Steps:
// 1. Verify webhook signature using WHOP_WEBHOOK_SECRET
// 2. Parse the event type and payload
// 3. Upsert entitlements table based on membership status
// 4. Log audit entry

export async function POST() {
  // Webhook stub — not implemented yet. Return 501 to signal this to callers.
  return NextResponse.json(
    { error: "Not implemented" },
    { status: 501 }
  );
}
