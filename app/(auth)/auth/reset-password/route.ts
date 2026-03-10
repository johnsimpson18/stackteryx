import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Code exchanged — user now has a valid session. Send them to
      // the reset-password page where they can set their new password.
      return NextResponse.redirect(`${origin}/reset-password`);
    }
  }

  // Invalid or expired token — redirect to forgot password flow
  return NextResponse.redirect(`${origin}/login?mode=forgot`);
}
