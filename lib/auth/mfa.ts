import { createClient } from "@/lib/supabase/server";

/** Returns true if the current session satisfies AAL2 (MFA verified) */
export async function isMFAVerified(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}

/** Returns true if the user has at least one TOTP factor enrolled */
export async function hasMFAEnrolled(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return (data?.totp?.length ?? 0) > 0;
}
