import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectPath(next: string | null): string {
  if (!next) return "/dashboard";
  // Must start with / but not // (protocol-relative URL attack)
  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectPath(requestUrl.searchParams.get("next"));

  // Use NEXT_PUBLIC_SITE_URL in production — origin can resolve incorrectly behind Vercel's proxy
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;

  // Temporary debug log — remove after diagnosing OAuth redirect issue
  console.log("CALLBACK HIT", {
    url: request.url,
    code: code ? `${code.slice(0, 8)}...` : null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    baseUrl,
    origin: requestUrl.origin,
    next,
  });

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has an org — new OAuth users may need setup
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          return NextResponse.redirect(`${baseUrl}/setup`);
        }
      }

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_failed`);
}
