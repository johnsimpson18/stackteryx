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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"));

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
          return NextResponse.redirect(`${origin}/setup`);
        }

        // Check onboarding status — incomplete users go to /onboarding
        const { data: orgSettings } = await supabase
          .from("org_settings")
          .select("onboarding_complete")
          .eq("org_id", membership.org_id)
          .maybeSingle();

        if (!orgSettings?.onboarding_complete) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login`);
}
