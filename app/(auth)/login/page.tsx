"use client";

import { useState, useTransition, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmail,
  signInWithGoogleAction,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  resendConfirmation,
} from "@/actions/auth";
import { Mail, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/* ─────────────────────────────────────────────────────────────
   STACKTERYX LOGIN PAGE
   Premium, enterprise-grade authentication screen.
   ───────────────────────────────────────────────────────────── */

// ── Password strength helpers ────────────────────────────────

function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  if (hasUpper && hasNumber) return 4;
  if (hasUpper || hasNumber) return 3;
  return 2;
}

const strengthColors = ["#1E1E1E", "#EF4444", "#F59E0B", "#F59E0B", "#c8f135"];
const strengthLabels = ["", "Too short", "Weak", "Almost there", "Strong"];

// ── Shared styled input ──────────────────────────────────────

function handleFocusRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#c8f135";
  e.currentTarget.style.boxShadow = "0 0 0 2px #c8f13525";
}
function handleBlurRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#1E1E1E";
  e.currentTarget.style.boxShadow = "none";
}

const inputStyle: React.CSSProperties = {
  background: "#0A0A0A",
  border: "1px solid #1E1E1E",
  color: "#FFFFFF",
  fontFamily: "var(--font-mono)",
};

const labelStyle: React.CSSProperties = {
  color: "#666666",
  fontFamily: "var(--font-mono)",
};

// ── Google SVG ───────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}

// ── Divider ──────────────────────────────────────────────────

function OrDivider({ text = "or continue with email" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3" style={{ margin: "16px 0" }}>
      <div className="flex-1 h-px" style={{ background: "#1E1E1E" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444444" }}>{text}</span>
      <div className="flex-1 h-px" style={{ background: "#1E1E1E" }} />
    </div>
  );
}

// ── Password strength bar ────────────────────────────────────

function PasswordStrengthBar({ strength }: { strength: number }) {
  return (
    <div className="space-y-1 pt-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className="flex-1 rounded-sm"
            style={{
              height: 3,
              background: strength >= seg ? strengthColors[strength] : "#1E1E1E",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      {strength > 0 && (
        <p style={{ color: "#666666", fontFamily: "var(--font-mono)", fontSize: 10 }}>
          {strengthLabels[strength]}
        </p>
      )}
    </div>
  );
}

// ── Google OAuth button ──────────────────────────────────────

function GoogleButton({
  pending,
  onAction,
}: {
  pending: boolean;
  onAction: () => void;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onAction}
      className="w-full h-10 rounded flex items-center justify-center gap-3 transition-all disabled:opacity-50"
      style={{
        background: "#FFFFFF",
        color: "#0A0A0A",
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize: 13,
        borderRadius: "var(--radius, 6px)",
      }}
      onMouseEnter={(e) => {
        if (!pending) e.currentTarget.style.background = "#F5F5F5";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#FFFFFF";
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </button>
  );
}

// ── Primary button ───────────────────────────────────────────

function PrimaryButton({
  label,
  loadingLabel,
  pending,
  disabled,
  type = "submit",
  onClick,
}: {
  label: string;
  loadingLabel: string;
  pending: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={pending || disabled}
      onClick={onClick}
      className="w-full h-10 rounded text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      style={{
        background: "#c8f135",
        color: "#2a4500",
        fontFamily: "var(--font-display)",
      }}
      onMouseEnter={(e) => {
        if (!pending && !disabled) e.currentTarget.style.background = "#d4f55c";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#c8f135";
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </button>
  );
}

// ── Password input with show/hide toggle ─────────────────────

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-medium"
        style={labelStyle}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 px-3 pr-10 rounded text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={handleFocusRing}
          onBlur={handleBlurRing}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "#444444" }}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Auth Card ────────────────────────────────────────────────

function AuthCard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tab state
  const [tab, setTab] = useState<"signin" | "signup">(() =>
    searchParams.get("tab") === "signup" ? "signup" : "signin"
  );

  // Sign-in mode (includes MFA challenge)
  type SignInMode = "default" | "forgot" | "forgot-sent" | "magic-link" | "magic-sent" | "mfa-challenge";
  const [signInMode, setSignInMode] = useState<SignInMode>(() => {
    const mode = searchParams.get("mode");
    if (mode === "forgot") {
      return searchParams.get("sent") === "true" ? "forgot-sent" : "forgot";
    }
    return "default";
  });

  // Shared
  const [isGooglePending, startGoogleTransition] = useTransition();

  // Sign-in form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Sign-up form
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);
  const [signUpError, setSignUpError] = useState("");
  const [isSignUpPending, startSignUpTransition] = useTransition();

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotPending, startForgotTransition] = useTransition();

  // Magic link
  const [isMagicPending, startMagicTransition] = useTransition();

  // Resend
  const [isResending, startResendTransition] = useTransition();

  // MFA
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState("");
  const [isMfaPending, setIsMfaPending] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // URL sync
  function updateUrl(params: Record<string, string | undefined>) {
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.searchParams.delete("mode");
    url.searchParams.delete("sent");
    for (const [key, val] of Object.entries(params)) {
      if (val) url.searchParams.set(key, val);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }

  function switchTab(t: "signin" | "signup") {
    setTab(t);
    setSignInError("");
    setSignUpError("");
    setIsUnconfirmed(false);
    if (t === "signup") {
      updateUrl({ tab: "signup" });
    } else {
      setSignInMode("default");
      updateUrl({});
    }
  }

  function switchToForgot() {
    setSignInMode("forgot");
    setForgotEmail(email);
    updateUrl({ mode: "forgot" });
  }

  function switchBackToSignIn() {
    setSignInMode("default");
    updateUrl({});
  }

  // Google auth
  function handleGoogle() {
    startGoogleTransition(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) setSignInError(result.error);
    });
  }

  // MFA check after sign-in
  async function checkMFAAndNavigate() {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (data && data.nextLevel === "aal2" && data.currentLevel !== "aal2") {
        // User has MFA — get factors and show challenge
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.[0];
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setSignInMode("mfa-challenge");
          return;
        }
      }

      // No MFA or already at AAL2 — navigate to dashboard
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  // Sign in
  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError("");
    setIsUnconfirmed(false);
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      if (!result.success) {
        const msg = result.error.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          setIsUnconfirmed(true);
          setSignInError("Please confirm your email before signing in.");
        } else {
          setSignInError("Incorrect email or password.");
        }
      } else {
        // Successful sign-in — check MFA
        await checkMFAAndNavigate();
      }
    });
  }

  // MFA verify
  async function handleMFAVerify() {
    if (mfaCode.length !== 6 || isMfaPending) return;
    setIsMfaPending(true);
    setMfaError("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: mfaFactorId });

      if (challengeError || !challengeData) {
        setMfaError("Verification failed. Please try again.");
        setMfaCode("");
        setIsMfaPending(false);
        mfaInputRef.current?.focus();
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });

      if (verifyError) {
        setMfaError("Incorrect code. Please try again.");
        setMfaCode("");
        setIsMfaPending(false);
        mfaInputRef.current?.focus();
        return;
      }

      // MFA verified — redirect to dashboard
      router.push("/dashboard");
    } catch {
      setMfaError("Something went wrong. Please try again.");
      setMfaCode("");
      setIsMfaPending(false);
    }
  }

  // Auto-submit MFA on 6 digits
  useEffect(() => {
    if (mfaCode.length === 6 && signInMode === "mfa-challenge") {
      handleMFAVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaCode]);

  // Sign up
  const signUpStrength = getPasswordStrength(signUpPassword);
  const passwordsMatch = signUpPassword === signUpConfirm;
  const canSignUp =
    signUpName.trim().length >= 2 &&
    signUpEmail.includes("@") &&
    signUpStrength === 4 &&
    passwordsMatch;

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!canSignUp) return;
    setSignUpError("");
    startSignUpTransition(async () => {
      const result = await signUpWithPassword(signUpEmail, signUpPassword, signUpName);
      if (result.success) {
        setSignUpDone(true);
      } else {
        setSignUpError(result.error);
      }
    });
  }

  // Forgot password
  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    startForgotTransition(async () => {
      await requestPasswordReset(forgotEmail);
      setSignInMode("forgot-sent");
      updateUrl({ mode: "forgot", sent: "true" });
    });
  }

  // Magic link
  function handleMagicLink() {
    if (!email) return;
    startMagicTransition(async () => {
      const result = await signInWithEmail(email);
      if (result.success) {
        setSignInMode("magic-sent");
      } else {
        setSignInError(result.error);
      }
    });
  }

  // Resend confirmation
  function handleResendConfirmation() {
    const targetEmail = tab === "signin" ? email : signUpEmail;
    startResendTransition(async () => {
      await resendConfirmation(targetEmail);
    });
  }

  // ── Render: MFA Challenge ──────────────────────────────────

  if (signInMode === "mfa-challenge") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2
            className="text-xl font-medium"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Enter your verification code
          </h2>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Open your authenticator app and enter the 6-digit code.
          </p>
        </div>

        <div className="space-y-3">
          <input
            ref={mfaInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setMfaCode(val);
              setMfaError("");
            }}
            className="w-full h-14 px-4 rounded text-center text-2xl tracking-[0.5em] font-mono outline-none transition-all"
            style={inputStyle}
            onFocus={handleFocusRing}
            onBlur={handleBlurRing}
            autoFocus
            placeholder="000000"
          />
          {mfaError && (
            <p style={{ color: "#EF4444", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center" }}>
              {mfaError}
            </p>
          )}
        </div>

        <PrimaryButton
          label="Verify"
          loadingLabel="Verifying..."
          pending={isMfaPending}
          disabled={mfaCode.length !== 6}
          type="button"
          onClick={handleMFAVerify}
        />

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setSignInMode("default");
              setMfaCode("");
              setMfaError("");
            }}
            className="text-xs transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            <ArrowLeft className="h-3 w-3 inline mr-1" />
            Use a different sign in method
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Sign In ────────────────────────────────────────

  function renderSignInContent() {
    // Magic link sent
    if (signInMode === "magic-sent") {
      return (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#c8f13515" }}
            >
              <Mail className="h-7 w-7" style={{ color: "#c8f135" }} />
            </div>
          </div>
          <h3
            className="text-lg font-medium"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Check your email
          </h3>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            We sent a login link to{" "}
            <strong style={{ color: "#c8f135" }}>{email}</strong>.
            Click the link to sign in.
          </p>
          <button
            onClick={() => setSignInMode("default")}
            className="text-xs transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            <ArrowLeft className="h-3 w-3 inline mr-1" />
            Try a different email
          </button>
        </div>
      );
    }

    // Magic link input mode
    if (signInMode === "magic-link") {
      return (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setSignInMode("default")}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>

          <div className="space-y-1">
            <h2
              className="text-xl font-medium"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Sign in with magic link
            </h2>
            <p
              className="text-sm"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            >
              We&apos;ll send a login link to your email.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="magic-email" className="text-xs font-medium" style={labelStyle}>
                Email address
              </label>
              <input
                id="magic-email"
                type="email"
                required
                placeholder="you@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocusRing}
                onBlur={handleBlurRing}
              />
            </div>
            <PrimaryButton
              label="Send magic link"
              loadingLabel="Sending..."
              pending={isMagicPending}
              disabled={!email}
              type="button"
              onClick={handleMagicLink}
            />
          </div>
        </div>
      );
    }

    // Forgot password
    if (signInMode === "forgot" || signInMode === "forgot-sent") {
      if (signInMode === "forgot-sent") {
        return (
          <div className="space-y-5">
            <button
              type="button"
              onClick={switchBackToSignIn}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
            <div className="text-center space-y-5 py-4">
              <div className="flex justify-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "#c8f13515" }}
                >
                  <Mail className="h-7 w-7" style={{ color: "#c8f135" }} />
                </div>
              </div>
              <h3
                className="text-lg font-medium"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                Check your email
              </h3>
              <p
                className="text-sm"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                If an account exists for{" "}
                <strong style={{ color: "#FFFFFF" }}>{forgotEmail}</strong>,
                you&apos;ll receive a password reset link within a few minutes.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-5">
          <button
            type="button"
            onClick={switchBackToSignIn}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
          <div className="space-y-1">
            <h2
              className="text-xl font-medium"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Reset your password
            </h2>
            <p className="text-sm" style={{ color: "#666666", fontFamily: "var(--font-mono)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-xs font-medium" style={labelStyle}>
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="you@yourcompany.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocusRing}
                onBlur={handleBlurRing}
              />
            </div>
            <PrimaryButton
              label="Send reset link"
              loadingLabel="Sending..."
              pending={isForgotPending}
            />
          </form>
        </div>
      );
    }

    // Default sign-in form
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2
            className="text-xl font-medium"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Welcome back
          </h2>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Sign in to your Stackteryx workspace
          </p>
        </div>

        <GoogleButton pending={isGooglePending} onAction={handleGoogle} />

        <OrDivider />

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="signin-email" className="text-xs font-medium" style={labelStyle}>
              Email address
            </label>
            <input
              id="signin-email"
              type="email"
              required
              placeholder="you@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocusRing}
              onBlur={handleBlurRing}
            />
          </div>

          <div className="space-y-1.5">
            <PasswordInput
              id="signin-password"
              label="Password"
              value={password}
              onChange={setPassword}
            />
            <div className="text-right">
              <button
                type="button"
                onClick={switchToForgot}
                style={{ color: "#666666", fontFamily: "var(--font-mono)", fontSize: 11 }}
                className="transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {signInError && (
            <p style={{ color: "#EF4444", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {signInError}
              {isUnconfirmed && (
                <>
                  <br />
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="transition-colors mt-1"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)", fontSize: 11 }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
                  >
                    {isResending ? "Resending..." : "Resend confirmation \u2192"}
                  </button>
                </>
              )}
            </p>
          )}

          <PrimaryButton
            label="Sign in"
            loadingLabel="Signing in..."
            pending={isPending}
          />
        </form>

        <p
          className="text-center text-xs"
          style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
        >
          Prefer a magic link?{" "}
          <button
            type="button"
            onClick={() => setSignInMode("magic-link")}
            className="transition-colors underline underline-offset-2"
            style={{ color: "#666666" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            Send me a login link
          </button>
        </p>

        <div className="text-center pt-2" style={{ borderTop: "1px solid #1E1E1E" }}>
          <p className="text-sm pt-4" style={{ color: "#666666", fontFamily: "var(--font-mono)" }}>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className="font-medium transition-colors"
              style={{ color: "#c8f135" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d4f55c")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#c8f135")}
            >
              Sign up free
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Render: Sign Up ────────────────────────────────────────

  function renderSignUpContent() {
    if (signUpDone) {
      return (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#c8f13515" }}
            >
              <Mail className="h-7 w-7" style={{ color: "#c8f135" }} />
            </div>
          </div>
          <h3
            className="text-lg font-medium"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Check your email
          </h3>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            We sent a confirmation link to{" "}
            <strong style={{ color: "#c8f135" }}>{signUpEmail}</strong>.
            Click the link to activate your account.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="text-xs transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            >
              {isResending ? "Resending..." : "Resend confirmation email"}
            </button>
            <br />
            <button
              type="button"
              onClick={() => {
                setSignUpDone(false);
                switchTab("signin");
              }}
              className="text-xs transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            >
              <ArrowLeft className="h-3 w-3 inline mr-1" />
              Back to sign in
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h2
            className="text-xl font-medium"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Create your account
          </h2>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Start your free Stackteryx account
          </p>
        </div>

        <GoogleButton pending={isGooglePending} onAction={handleGoogle} />

        <OrDivider />

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="signup-name" className="text-xs font-medium" style={labelStyle}>
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              required
              placeholder="John Smith"
              value={signUpName}
              onChange={(e) => setSignUpName(e.target.value)}
              className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocusRing}
              onBlur={handleBlurRing}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="signup-email" className="text-xs font-medium" style={labelStyle}>
              Email address
            </label>
            <input
              id="signup-email"
              type="email"
              required
              placeholder="you@yourcompany.com"
              value={signUpEmail}
              onChange={(e) => setSignUpEmail(e.target.value)}
              className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
              style={inputStyle}
              onFocus={handleFocusRing}
              onBlur={handleBlurRing}
            />
          </div>

          <div>
            <PasswordInput
              id="signup-password"
              label="Password"
              value={signUpPassword}
              onChange={setSignUpPassword}
            />
            <PasswordStrengthBar strength={signUpStrength} />
          </div>

          <div>
            <PasswordInput
              id="signup-confirm"
              label="Confirm password"
              value={signUpConfirm}
              onChange={(v) => {
                setSignUpConfirm(v);
                if (!confirmTouched) setConfirmTouched(true);
              }}
            />
            {confirmTouched && signUpConfirm && !passwordsMatch && (
              <p
                className="mt-1"
                style={{ color: "#EF4444", fontFamily: "var(--font-mono)", fontSize: 11 }}
              >
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {signUpError && (
            <p style={{ color: "#EF4444", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {signUpError}
            </p>
          )}

          <PrimaryButton
            label="Create account"
            loadingLabel="Creating account..."
            pending={isSignUpPending}
            disabled={!canSignUp}
          />
        </form>

        <div className="text-center pt-2" style={{ borderTop: "1px solid #1E1E1E" }}>
          <p className="text-sm pt-4" style={{ color: "#666666", fontFamily: "var(--font-mono)" }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchTab("signin")}
              className="font-medium transition-colors"
              style={{ color: "#c8f135" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d4f55c")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#c8f135")}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    );
  }

  return tab === "signin" ? renderSignInContent() : renderSignUpContent();
}

// ── Main page component ──────────────────────────────────────

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#0A0A0A" }}
    >
      {/* Logo + tagline */}
      <div className="text-center mb-8 space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/stackteryx-logo.svg"
          alt="Stackteryx"
          height={28}
          style={{ height: 28, width: "auto" }}
          className="mx-auto"
        />
        <p
          className="text-[13px]"
          style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
        >
          The service economics platform for MSPs
        </p>
      </div>

      {/* Auth card */}
      <div
        className="w-full rounded-xl p-8 relative"
        style={{
          maxWidth: 400,
          background: "#111111",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#666666" }} />
          </div>
        }>
          <AuthCard />
        </Suspense>
      </div>

      {/* Terms */}
      <p
        className="mt-6 text-center text-[11px] max-w-xs"
        style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
      >
        By continuing, you agree to our{" "}
        <Link href="#" className="underline underline-offset-2 transition-colors hover:text-[#666666]">Terms of Service</Link>
        {" "}and{" "}
        <Link href="#" className="underline underline-offset-2 transition-colors hover:text-[#666666]">Privacy Policy</Link>
      </p>
    </div>
  );
}
