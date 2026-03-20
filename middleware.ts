import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (handled separately)
     * - files with extensions (public assets like .svg, .png, .jpg, .css, .js)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/)(?!.*\\.[\\w]+$).*)",
  ],
};
