import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ORG_COOKIE = "x-org-id";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
    pathname.startsWith("/services") ||
    pathname.startsWith("/additional-services") ||
    pathname.startsWith("/cto-briefs");

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

  // Onboarding is now handled by a modal gate inside the app layout.
  // If users navigate to /onboarding directly, redirect them to /dashboard
  // where the gate modal will show automatically.
  if (user && pathname.startsWith("/onboarding")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
