import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ORG_COOKIE = "x-org-id";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes: redirect unauthenticated users to /login
  const isAppRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tools") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/bundles") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/scenarios") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/vendors") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/recommend") ||
    pathname.startsWith("/services");

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If user is logged in and hitting login page, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // After login, if no display_name is set, redirect to setup
  if (user && isAppRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, active_org_id")
      .eq("id", user.id)
      .single();

    if (profile && !profile.display_name && pathname !== "/setup") {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }

    // Ensure x-org-id cookie is set from profile.active_org_id
    if (profile?.active_org_id && !request.cookies.get(ORG_COOKIE)?.value) {
      supabaseResponse.cookies.set(ORG_COOKIE, profile.active_org_id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  // After profile setup, if onboarding not completed, redirect to /onboarding.
  // Wrapped in try/catch because the org_settings row may not exist yet.
  // In that case we let the user through rather than loop them.
  if (user && isAppRoute && !pathname.startsWith("/onboarding") && pathname !== "/setup") {
    try {
      const orgId = request.cookies.get(ORG_COOKIE)?.value;
      if (orgId) {
        const { data: orgSettings } = await supabase
          .from("org_settings")
          .select("onboarding_complete")
          .eq("org_id", orgId)
          .single();

        // Only redirect if the row exists AND onboarding is explicitly false.
        // null/undefined means no row — don't redirect.
        if (orgSettings && orgSettings.onboarding_complete === false) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          return NextResponse.redirect(url);
        }
      }
    } catch {
      // Query failed — don't block the user
    }
  }

  return supabaseResponse;
}
