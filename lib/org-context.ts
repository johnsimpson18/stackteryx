import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { OrgMember } from "@/lib/types";

const ORG_COOKIE = "x-org-id";

// cache() deduplicates this within a single request — zero extra latency on repeat calls
const verifyOrgMembership = cache(async (userId: string, orgId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();
  return !!data;
});

/**
 * Get the active org ID for the current user.
 * 1. Check `x-org-id` cookie (validated against org_members)
 * 2. Fall back to `profiles.active_org_id`
 * 3. Fall back to user's first org membership
 * Returns null if user has no org.
 */
export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ORG_COOKIE)?.value;

  // Fast UUID format check — reject obviously invalid values before hitting the DB
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (fromCookie) {
    if (!uuidPattern.test(fromCookie)) return null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const isMember = await verifyOrgMembership(user.id, fromCookie);
    if (isMember) return fromCookie;

    // Cookie was invalid — ignore and resolve org from profile.
    // The cookie will be overwritten when a valid org is next set via setActiveOrg().
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Check profile.active_org_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_org_id")
    .eq("id", user.id)
    .single();

  if (profile?.active_org_id) {
    if (uuidPattern.test(profile.active_org_id)) {
      const isMember = await verifyOrgMembership(user.id, profile.active_org_id);
      if (isMember) {
        return profile.active_org_id;
      }
    }
  }

  // Fall back to first org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (membership?.org_id) {
    // Persist to profile (cookie will be set on next setActiveOrg call)
    await supabase
      .from("profiles")
      .update({ active_org_id: membership.org_id })
      .eq("id", user.id);
    return membership.org_id;
  }

  return null;
}

/**
 * Set the active org cookie and update profiles.active_org_id
 */
export async function setActiveOrg(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ active_org_id: orgId })
      .eq("id", user.id);
  }
}

/**
 * Get the current user's org membership for a given org.
 * Returns null if not a member.
 */
export async function getOrgMembership(
  orgId: string
): Promise<OrgMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  return data as OrgMember;
}

/**
 * Require org membership. Returns orgId and membership, or throws redirect.
 * If the cookie points to a stale org the user isn't a member of,
 * retries from profile / first membership.
 */
export async function requireOrgMembership(): Promise<{
  orgId: string;
  membership: OrgMember;
}> {
  const orgId = await getActiveOrgId();
  if (!orgId) {
    throw new Error("No active org");
  }

  const membership = await getOrgMembership(orgId);
  if (membership) {
    return { orgId, membership };
  }

  // Cookie was stale — resolve from profile/membership
  // (cannot delete cookie during render; it will be overwritten on next setActiveOrg)
  const retryOrgId = await getActiveOrgId();
  if (!retryOrgId) {
    throw new Error("No active org");
  }

  const retryMembership = await getOrgMembership(retryOrgId);
  if (!retryMembership) {
    throw new Error("Not a member of the active org");
  }

  return { orgId: retryOrgId, membership: retryMembership };
}
