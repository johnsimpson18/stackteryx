"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { profileSetupSchema } from "@/lib/schemas/profile";
import { updateProfile } from "@/lib/db/profiles";
import type { ActionResult } from "@/lib/types";

export async function signInWithEmail(
  email: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function setupProfile(
  formData: { display_name: string }
): Promise<ActionResult> {
  try {
    const parsed = profileSetupSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message ?? "Invalid input",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    await updateProfile(user.id, {
      display_name: parsed.data.display_name,
    });

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Failed to update profile" };
  }
}

export async function signInWithGoogleAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Get display name from user metadata ───────────────────────────

export async function getAuthDisplayName(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return (
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      ""
    );
  } catch {
    return "";
  }
}

// ── Password validation ───────────────────────────────────────────
// Min 8 chars, at least one uppercase letter, at least one number

function validatePassword(
  password: string
): { valid: true } | { valid: false; error: string } {
  if (password.length < 8)
    return { valid: false, error: "Password must be at least 8 characters" };
  if (!/[A-Z]/.test(password))
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  if (!/[0-9]/.test(password))
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  return { valid: true };
}

// ── Email/password sign-up ────────────────────────────────────────
// NOTE: Email confirmation must be enabled in the Supabase dashboard
// (Authentication → Email → Confirm email = ON) for this flow to
// require the user to confirm their email before signing in.

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string
): Promise<ActionResult> {
  try {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return { success: false, error: pwCheck.error };

    if (!displayName || displayName.trim().length < 2) {
      return { success: false, error: "Display name must be at least 2 characters" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) return { success: false, error: error.message };

    // If the user was created and we have an id, set up the profile record
    if (data.user) {
      try {
        await updateProfile(data.user.id, {
          display_name: displayName.trim(),
        });
      } catch {
        // Profile creation may fail if RLS blocks it before confirmation —
        // the profile will be created on first sign-in via the callback flow.
      }
    }

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── Email/password sign-in ────────────────────────────────────────

export async function signInWithPassword(
  email: string,
  password: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };

    // Return success — the client handles MFA check and navigation
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── Password reset request ────────────────────────────────────────

export async function requestPasswordReset(
  email: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        process.env.NEXT_PUBLIC_SITE_URL + "/auth/reset-password",
    });

    // Always return success regardless of whether the email exists
    return { success: true, data: undefined };
  } catch {
    return { success: true, data: undefined };
  }
}

// ── Update password (from reset flow) ─────────────────────────────

export async function updatePassword(
  newPassword: string
): Promise<ActionResult> {
  try {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) return { success: false, error: pwCheck.error };

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) return { success: false, error: error.message };

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── Resend confirmation email ─────────────────────────────────────

export async function resendConfirmation(
  email: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) return { success: false, error: error.message };

    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}
