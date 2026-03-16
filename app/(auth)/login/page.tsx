"use client";

import { useState, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  signInWithEmail,
  signInWithGoogleAction,
  signInWithPassword,
  signUpWithPassword,
  requestPasswordReset,
  resendConfirmation,
} from "@/actions/auth";
import { toast } from "sonner";
import {
  Mail, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft,
  Brain, TrendingDown, Table, Target, Wrench, Package,
  DollarSign, FileText, BarChart2, Sparkles,
} from "lucide-react";


/* ─────────────────────────────────────────────────────────────
   STACKTERYX LANDING PAGE
   Industrial-premium marketing + login entry point.
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

const strengthColors = ["#1E1E1E", "#EF4444", "#F59E0B", "#F59E0B", "#A8FF3E"];
const strengthLabels = ["", "Too short", "Weak", "Almost there", "Strong"];

// ── Shared styled input focus/blur handlers ──────────────────

function handleFocusRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#A8FF3E";
  e.currentTarget.style.boxShadow = "0 0 0 2px #A8FF3E25";
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

function OrDivider() {
  return (
    <div className="flex items-center gap-3" style={{ margin: "16px 0" }}>
      <div className="flex-1 h-px" style={{ background: "#1E1E1E" }} />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#444444" }}>or</span>
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
        borderRadius: "var(--radius, 2px)",
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
      className="w-full h-10 rounded text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
      style={{
        background: "#A8FF3E",
        color: "#0A0A0A",
        fontFamily: "var(--font-display)",
      }}
      onMouseEnter={(e) => {
        if (!pending && !disabled) e.currentTarget.style.background = "#BFFF5C";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#A8FF3E";
      }}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        label
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
        className="text-xs uppercase tracking-widest"
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

// ── Auth Card (extracted for Suspense boundary) ──────────────

function AuthCard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Shared state ──────────────────────────────────────────
  const [isGooglePending, startGoogleTransition] = useTransition();

  // ── Tab state — "signin" | "signup" ───────────────────────
  const [tab, setTab] = useState<"signin" | "signup">(() =>
    searchParams.get("tab") === "signup" ? "signup" : "signin"
  );

  // ── Mode state for sign-in card ───────────────────────────
  type SignInMode = "default" | "forgot" | "forgot-sent" | "magic-sent";
  const [signInMode, setSignInMode] = useState<SignInMode>(() => {
    const mode = searchParams.get("mode");
    if (mode === "forgot") {
      return searchParams.get("sent") === "true" ? "forgot-sent" : "forgot";
    }
    return "default";
  });

  // ── Sign-in form state ────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // ── Sign-up form state ────────────────────────────────────
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirm, setSignUpConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);
  const [isSignUpPending, startSignUpTransition] = useTransition();

  // ── Forgot password state ─────────────────────────────────
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotPending, startForgotTransition] = useTransition();

  // ── Magic link state ──────────────────────────────────────
  const [isMagicPending, startMagicTransition] = useTransition();

  // ── Resend state ──────────────────────────────────────────
  const [isResending, startResendTransition] = useTransition();

  // ── URL sync ──────────────────────────────────────────────
  function updateUrl(params: Record<string, string | undefined>) {
    const url = new URL(window.location.href);
    // Clear existing auth params
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

  // ── Google auth handler ───────────────────────────────────
  function handleGoogle() {
    startGoogleTransition(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) toast.error(result.error);
    });
  }

  // ── Sign in handler ───────────────────────────────────────
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
      }
    });
  }

  // ── Sign up handler ───────────────────────────────────────
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
    startSignUpTransition(async () => {
      const result = await signUpWithPassword(signUpEmail, signUpPassword, signUpName);
      if (result.success) {
        setSignUpDone(true);
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Forgot password handler ───────────────────────────────
  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    startForgotTransition(async () => {
      await requestPasswordReset(forgotEmail);
      setSignInMode("forgot-sent");
      updateUrl({ mode: "forgot", sent: "true" });
    });
  }

  // ── Magic link handler ────────────────────────────────────
  function handleMagicLink() {
    if (!email) return;
    startMagicTransition(async () => {
      const result = await signInWithEmail(email);
      if (result.success) {
        setSignInMode("magic-sent");
        toast.success("Check your email for the magic link!");
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Resend confirmation handler ───────────────────────────
  function handleResendConfirmation() {
    const targetEmail = tab === "signin" ? email : signUpEmail;
    startResendTransition(async () => {
      const result = await resendConfirmation(targetEmail);
      if (result.success) {
        toast.success("Confirmation email resent!");
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Render card body ──────────────────────────────────────

  function renderSignInContent() {
    // Magic link sent state
    if (signInMode === "magic-sent") {
      return (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#A8FF3E15" }}
            >
              <Mail className="h-7 w-7" style={{ color: "#A8FF3E" }} />
            </div>
          </div>
          <h3
            className="text-lg font-bold"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            CHECK YOUR EMAIL
          </h3>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            We sent a magic link to{" "}
            <strong style={{ color: "#A8FF3E" }}>{email}</strong>.
            Click the link to sign in.
          </p>
          <button
            onClick={() => setSignInMode("default")}
            className="text-xs underline underline-offset-4 transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            Try a different email
          </button>
        </div>
      );
    }

    // Forgot password states
    if (signInMode === "forgot" || signInMode === "forgot-sent") {
      if (signInMode === "forgot-sent") {
        return (
          <div className="space-y-5">
            <button
              type="button"
              onClick={switchBackToSignIn}
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            >
              <ArrowLeft className="h-3 w-3" /> Back to sign in
            </button>
            <div className="text-center space-y-5 py-4">
              <div className="flex justify-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "#A8FF3E15" }}
                >
                  <Mail className="h-7 w-7" style={{ color: "#A8FF3E" }} />
                </div>
              </div>
              <h3
                className="text-lg font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                CHECK YOUR EMAIL
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

      // Forgot password form
      return (
        <div className="space-y-5">
          <button
            type="button"
            onClick={switchBackToSignIn}
            className="flex items-center gap-1.5 text-xs transition-colors"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
          >
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </button>
          <div className="space-y-1">
            <h2
              className="text-xl font-bold uppercase tracking-wide"
              style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
            >
              RESET YOUR PASSWORD
            </h2>
            <p
              className="text-xs"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            >
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="forgot-email"
                className="text-xs uppercase tracking-widest"
                style={labelStyle}
              >
                EMAIL
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                placeholder="you@yourmsp.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={handleFocusRing}
                onBlur={handleBlurRing}
              />
            </div>
            <PrimaryButton
              label="SEND RESET LINK"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stackteryx-logo.svg" alt="Stackteryx" height={32} style={{ height: 32, width: "auto" }} />
          <p
            className="text-xs"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Sign in to your workspace
          </p>
        </div>

        <GoogleButton pending={isGooglePending} onAction={handleGoogle} />

        <OrDivider />

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="signin-email"
              className="text-xs uppercase tracking-widest"
              style={labelStyle}
            >
              EMAIL
            </label>
            <input
              id="signin-email"
              type="email"
              required
              placeholder="you@yourmsp.com"
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
              label="PASSWORD"
              value={password}
              onChange={setPassword}
            />
            <div className="text-right">
              <button
                type="button"
                onClick={switchToForgot}
                style={{ color: "#666666", fontFamily: "var(--font-mono)", fontSize: 11 }}
                className="transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
              >
                Forgot password?
              </button>
            </div>
          </div>

          {signInError && (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              <p style={{ color: "#EF4444" }}>{signInError}</p>
              {isUnconfirmed && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="transition-colors mt-1"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)", fontSize: 11 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
                >
                  {isResending ? "Resending..." : "Resend confirmation →"}
                </button>
              )}
            </div>
          )}

          <PrimaryButton
            label="SIGN IN"
            loadingLabel="Signing in..."
            pending={isPending}
          />
        </form>

        <OrDivider />

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={isMagicPending || !email}
          className="w-full h-10 rounded text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: "transparent",
            border: "1px solid #1E1E1E",
            color: "#FFFFFF",
            fontFamily: "var(--font-mono)",
          }}
          onMouseEnter={(e) => {
            if (!isMagicPending) e.currentTarget.style.borderColor = "#333333";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1E1E1E";
          }}
        >
          {isMagicPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : (
            "Send Magic Link"
          )}
        </button>

        <p
          className="text-[10px]"
          style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
        >
          By signing in you agree to our Terms of Service
        </p>
      </div>
    );
  }

  function renderSignUpContent() {
    // Success state — email confirmation
    if (signUpDone) {
      return (
        <div className="text-center space-y-5 py-4">
          <div className="flex justify-center">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "#A8FF3E15" }}
            >
              <Mail className="h-7 w-7" style={{ color: "#A8FF3E" }} />
            </div>
          </div>
          <h3
            className="text-lg font-bold"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            CHECK YOUR EMAIL
          </h3>
          <p
            className="text-sm"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            We sent a confirmation link to{" "}
            <strong style={{ color: "#A8FF3E" }}>{signUpEmail}</strong>.
            Click the link to activate your account.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isResending}
              className="text-xs transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
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
              className="text-xs underline underline-offset-4 transition-colors"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            >
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
            className="text-xl font-bold uppercase tracking-wide"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
          >
            CREATE ACCOUNT
          </h2>
          <p
            className="text-xs"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Set up your Stackteryx workspace
          </p>
        </div>

        <GoogleButton pending={isGooglePending} onAction={handleGoogle} />

        <OrDivider />

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="signup-name"
              className="text-xs uppercase tracking-widest"
              style={labelStyle}
            >
              FULL NAME
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
            <label
              htmlFor="signup-email"
              className="text-xs uppercase tracking-widest"
              style={labelStyle}
            >
              EMAIL
            </label>
            <input
              id="signup-email"
              type="email"
              required
              placeholder="you@yourmsp.com"
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
              label="PASSWORD"
              value={signUpPassword}
              onChange={setSignUpPassword}
            />
            <PasswordStrengthBar strength={signUpStrength} />
          </div>

          <div>
            <PasswordInput
              id="signup-confirm"
              label="CONFIRM PASSWORD"
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

          <PrimaryButton
            label="CREATE ACCOUNT"
            loadingLabel="Creating account..."
            pending={isSignUpPending}
            disabled={!canSignUp}
          />
        </form>

        <p
          className="text-[10px]"
          style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
        >
          By creating an account you agree to our Terms of Service
        </p>
      </div>
    );
  }

  return (
    <div
      className="landing-fade-in landing-glow rounded-lg p-6 relative"
      style={{
        animationDelay: "700ms",
        background: "#111111",
        border: "1px solid #1E1E1E",
        scrollMarginTop: "80px",
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, #A8FF3E60, transparent)",
        }}
      />

      {/* Tab toggle */}
      <div className="flex mb-5" style={{ borderBottom: "1px solid #1E1E1E" }}>
        <button
          type="button"
          onClick={() => switchTab("signin")}
          className="flex-1 pb-3 text-xs uppercase tracking-widest font-medium transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            color: tab === "signin" ? "#A8FF3E" : "#444444",
            borderBottom: tab === "signin" ? "2px solid #A8FF3E" : "2px solid transparent",
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => switchTab("signup")}
          className="flex-1 pb-3 text-xs uppercase tracking-widest font-medium transition-colors"
          style={{
            fontFamily: "var(--font-mono)",
            color: tab === "signup" ? "#A8FF3E" : "#444444",
            borderBottom: tab === "signup" ? "2px solid #A8FF3E" : "2px solid transparent",
          }}
        >
          Create Account
        </button>
      </div>

      {tab === "signin" ? renderSignInContent() : renderSignUpContent()}
    </div>
  );
}


// ── Main page component ──────────────────────────────────────

export default function LoginPage() {
  function scrollToLogin(e: React.MouseEvent) {
    e.preventDefault();
    document.getElementById("login")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToSection(e: React.MouseEvent, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", scrollPaddingTop: "80px" }}>

      {/* ═══════════════════════════════════════════════════════
          NAVIGATION BAR
          ═══════════════════════════════════════════════════════ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between h-16 px-6"
        style={{
          background: "#0A0A0AEE",
          borderBottom: "1px solid #1E1E1E",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/stackteryx-logo.svg" alt="Stackteryx" height={24} style={{ height: 24, width: "auto" }} />

        <div className="flex items-center gap-3">
          <a
            href="/fractional-cto"
            className="h-8 px-4 flex items-center gap-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: "#c8f135",
              border: "1px solid #c8f13540",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c8f135";
              e.currentTarget.style.background = "#c8f13510";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#c8f13540";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Free CTO Brief
          </a>
          <a
            href="#login"
            onClick={scrollToLogin}
            className="h-8 px-4 flex items-center rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: "#FFFFFF",
              border: "1px solid #1E1E1E",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c8f135";
              e.currentTarget.style.color = "#c8f135";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#1E1E1E";
              e.currentTarget.style.color = "#FFFFFF";
            }}
          >
            Log In
          </a>
          <a
            href="#login"
            onClick={scrollToLogin}
            className="h-8 px-4 flex items-center rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: "#c8f135",
              color: "#0A0A0A",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
          >
            Sign Up
          </a>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO + LOGIN
          ═══════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-[calc(100vh-64px)] flex items-center"
        style={{
          backgroundImage:
            "linear-gradient(#c8f13508 1px, transparent 1px), linear-gradient(90deg, #c8f13508 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-6 py-16 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-center">

            {/* Left — Headline */}
            <div className="lg:col-span-3 space-y-8">
              {/* Eyebrow */}
              <p
                className="landing-fade-in text-xs uppercase tracking-[0.3em] font-bold"
                style={{ color: "#c8f135", fontFamily: "var(--font-mono)", animationDelay: "0ms" }}
              >
                THE SERVICE ECONOMICS PLATFORM FOR MSPS
              </p>

              <h1
                className="text-[40px] md:text-[60px] lg:text-[72px] font-extrabold leading-[0.95] tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="landing-word block" style={{ color: "#FFFFFF", animationDelay: "0ms" }}>
                  Your MSP deserves
                </span>
                <span className="landing-word block" style={{ color: "#FFFFFF", animationDelay: "60ms" }}>
                  better than
                </span>
                <span
                  className="landing-word landing-glow-text block"
                  style={{ color: "#c8f135", animationDelay: "120ms" }}
                >
                  a spreadsheet.
                </span>
              </h1>

              <p
                className="landing-fade-in max-w-xl text-[15px] leading-relaxed"
                style={{
                  color: "#999999",
                  animationDelay: "300ms",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Most MSPs price services on gut instinct and track margins in Excel.
                Stackteryx replaces the guesswork with real unit economics — so every
                service you sell is profitable by design.
              </p>

              {/* CTA buttons */}
              <div
                className="landing-fade-in flex flex-wrap items-center gap-4 pt-2"
                style={{ animationDelay: "450ms" }}
              >
                <a
                  href="#login"
                  onClick={scrollToLogin}
                  className="h-11 px-6 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: "#c8f135",
                    color: "#0A0A0A",
                    fontFamily: "var(--font-display)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, "how-it-works")}
                  className="h-11 px-6 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
                  style={{
                    color: "#FFFFFF",
                    border: "1px solid #1E1E1E",
                    fontFamily: "var(--font-display)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#c8f135";
                    e.currentTarget.style.color = "#c8f135";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1E1E1E";
                    e.currentTarget.style.color = "#FFFFFF";
                  }}
                >
                  See How It Works
                </a>
              </div>

              {/* Credibility line */}
              <p
                className="landing-fade-in text-xs"
                style={{
                  color: "#444444",
                  animationDelay: "550ms",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Free forever for one service. No credit card required.
              </p>
            </div>

            {/* Right — Login Card */}
            <div className="lg:col-span-2" id="login">
              <Suspense fallback={
                <div
                  className="landing-fade-in landing-glow rounded-lg p-6 relative"
                  style={{
                    animationDelay: "700ms",
                    background: "#111111",
                    border: "1px solid #1E1E1E",
                    scrollMarginTop: "80px",
                    minHeight: 400,
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, #A8FF3E60, transparent)" }}
                  />
                </div>
              }>
                <AuthCard />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — THE PAIN
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          <div className="space-y-4">
            <p
              className="text-xs uppercase tracking-[0.3em] font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
            >
              THE PROBLEM
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Sound familiar?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — Profitability */}
            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <TrendingDown className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;Are we actually making money on this client?&rdquo;
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                You won the deal, but vendor costs crept up and scope expanded.
                Six months later you&apos;re not sure the service is still profitable.
              </p>
            </div>

            {/* Card 2 — Spreadsheets */}
            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <Table className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;Let me find the right spreadsheet...&rdquo;
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Pricing lives in a spreadsheet. Proposals live in another.
                Cost data lives in a third. None of them agree.
              </p>
            </div>

            {/* Card 3 — Positioning */}
            <div
              className="rounded-lg p-6 text-left space-y-3"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center"
                style={{ background: "#c8f13510" }}
              >
                <Target className="h-5 w-5" style={{ color: "#c8f135" }} />
              </div>
              <h3
                className="text-base font-bold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                &ldquo;How do we differentiate from the MSP down the road?&rdquo;
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Every competitor sells &ldquo;managed security.&rdquo; Without
                outcome-based positioning, you&apos;re competing on price alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE BIG IDEA (interstitial)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
          <p
            className="text-xs uppercase tracking-[0.3em] font-bold"
            style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
          >
            A BETTER WAY
          </p>
          <h2
            className="text-3xl md:text-5xl font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            What if every service you sold was{" "}
            <span style={{ color: "#c8f135" }}>profitable by design?</span>
          </h2>
          <p
            className="text-base leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono)" }}
          >
            Stackteryx connects your service catalog, vendor costs, and pricing in one
            place — then uses AI to help you build, price, and sell services that
            actually make money.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — SPREADSHEET VS STACKTERYX
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <p
              className="text-xs uppercase tracking-[0.3em] font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
            >
              THE COMPARISON
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Spreadsheet vs. Stackteryx
            </h2>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid #1E1E1E" }}
          >
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-mono)" }}>
              <thead>
                <tr style={{ background: "#0A0A0A" }}>
                  <th
                    className="text-left px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#666666" }}
                  >
                    Capability
                  </th>
                  <th
                    className="text-center px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#666666" }}
                  >
                    Spreadsheet
                  </th>
                  <th
                    className="text-center px-5 py-3 text-xs uppercase tracking-wider font-bold"
                    style={{ color: "#c8f135" }}
                  >
                    Stackteryx
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Live unit-cost margins", false, true],
                  ["Outcome-based service design", false, true],
                  ["One-click proposal generation", false, true],
                  ["Multi-tier pricing engine", false, true],
                  ["AI technology advisory", false, true],
                  ["Portfolio-wide profitability view", false, true],
                  ["Client compliance scoring", false, true],
                ].map(([label, spreadsheet, stx], i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 === 0 ? "#111111" : "#0A0A0A",
                      borderTop: "1px solid #1E1E1E",
                    }}
                  >
                    <td className="px-5 py-3" style={{ color: "#CCCCCC" }}>
                      {label as string}
                    </td>
                    <td className="text-center px-5 py-3" style={{ color: "#EF4444" }}>
                      {spreadsheet ? "✓" : "✗"}
                    </td>
                    <td className="text-center px-5 py-3" style={{ color: "#c8f135" }}>
                      {stx ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-20 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <p
              className="text-xs uppercase tracking-[0.3em] font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
            >
              HOW IT WORKS
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Four steps to profitable services
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Define the Outcome",
                desc: "Start with the business problem your service solves — not the tools in the stack.",
                Icon: Target,
              },
              {
                step: "02",
                title: "Build the Stack",
                desc: "Add vendor tools, set unit costs, and let the pricing engine calculate margins automatically.",
                Icon: Wrench,
              },
              {
                step: "03",
                title: "Price with Confidence",
                desc: "Multi-tier pricing (Good / Better / Best) with real-time margin visibility on every tier.",
                Icon: DollarSign,
              },
              {
                step: "04",
                title: "Sell and Deliver",
                desc: "Generate branded proposals, track contracts, and monitor profitability across your portfolio.",
                Icon: FileText,
              },
            ].map(({ step, title, desc, Icon }) => (
              <div
                key={step}
                className="rounded-lg p-6 space-y-3"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
              >
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
                >
                  STEP {step}
                </span>
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13510" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#c8f135" }} />
                </div>
                <h3
                  className="text-base font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — FRACTIONAL CTO
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p
                className="text-xs uppercase tracking-[0.3em] font-bold"
                style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
              >
                FRACTIONAL CTO
              </p>
              <h2
                className="text-3xl md:text-4xl font-extrabold"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                Give every client a CTO —{" "}
                <span style={{ color: "#c8f135" }}>without hiring one.</span>
              </h2>
              <p
                className="text-base leading-relaxed"
                style={{ color: "#999999", fontFamily: "var(--font-mono)" }}
              >
                Generate executive-grade Technology Strategy Briefs that surface
                risks, recommend actions, and position your MSP as a strategic
                advisor — not just a vendor.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    title: "AI-Generated Briefs",
                    desc: "Quarterly technology strategy reports tailored to each client's industry and stack.",
                  },
                  {
                    title: "Risk Intelligence",
                    desc: "Surface technology risks before they become incidents. Clients see you as proactive, not reactive.",
                  },
                  {
                    title: "Revenue Expansion",
                    desc: "Every brief is a conversation starter for new services. Advisory becomes a billable offering.",
                  },
                ].map(({ title, desc }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3"
                  >
                    <div
                      className="flex-shrink-0 h-6 w-6 rounded flex items-center justify-center mt-0.5"
                      style={{ background: "#c8f13515" }}
                    >
                      <Brain className="h-3.5 w-3.5" style={{ color: "#c8f135" }} />
                    </div>
                    <div>
                      <p
                        className="text-sm font-bold"
                        style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                      >
                        {title}
                      </p>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="/fractional-cto"
                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors"
                style={{ color: "#c8f135", fontFamily: "var(--font-display)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#d4f55c")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c8f135")}
              >
                Try a Free CTO Brief
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            {/* Right — visual */}
            <div
              className="rounded-lg p-8 space-y-4"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13515" }}
                >
                  <Brain className="h-5 w-5" style={{ color: "#c8f135" }} />
                </div>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    Technology Strategy Brief
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    Q1 2026 &middot; Healthcare
                  </p>
                </div>
              </div>
              <div
                className="h-px w-full"
                style={{ background: "#1E1E1E" }}
              />
              {[
                { label: "Technology Risks", value: "3 identified", color: "#EF4444" },
                { label: "Strategic Recommendations", value: "5 actions", color: "#c8f135" },
                { label: "Budget Guidance", value: "$24k–$36k/yr", color: "#3B82F6" },
                { label: "Compliance Gaps", value: "2 critical", color: "#F59E0B" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono)" }}>
                    {label}
                  </span>
                  <span className="text-sm font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — WHAT'S INSIDE
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <p
              className="text-xs uppercase tracking-[0.3em] font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
            >
              PLATFORM
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Everything you need to run profitable services
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                Icon: Package,
                title: "Service Builder",
                desc: "Define services around business outcomes, not tools. Structure what you sell and why it matters.",
              },
              {
                Icon: Wrench,
                title: "Bundle Configurator",
                desc: "Assemble vendor tools into service bundles with per-unit cost tracking built in.",
              },
              {
                Icon: DollarSign,
                title: "Pricing Engine",
                desc: "Good / Better / Best tiers with real-time margin calculations. No more guesswork.",
              },
              {
                Icon: FileText,
                title: "Sales Studio",
                desc: "Generate branded, client-ready proposals in seconds — pre-filled with your pricing and positioning.",
              },
              {
                Icon: Brain,
                title: "Fractional CTO",
                desc: "AI-generated Technology Strategy Briefs that position you as a strategic advisor.",
              },
              {
                Icon: BarChart2,
                title: "Portfolio Intelligence",
                desc: "See profitability across every client and service. Spot margin erosion before it hurts.",
              },
              {
                Icon: Sparkles,
                title: "AI Service Architect",
                desc: "Describe what you want to build — AI structures the service, suggests tools, and sets pricing.",
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg p-5 space-y-3 transition-colors"
                style={{ background: "#111111", border: "1px solid #1E1E1E" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c8f13540")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E1E1E")}
              >
                <div
                  className="h-9 w-9 rounded-md flex items-center justify-center"
                  style={{ background: "#c8f13510" }}
                >
                  <Icon className="h-4.5 w-4.5" style={{ color: "#c8f135" }} />
                </div>
                <h3
                  className="text-sm font-bold"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — PRICING
          ═══════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: "#111111" }} className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-4">
            <p
              className="text-xs uppercase tracking-[0.3em] font-bold"
              style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
            >
              PRICING
            </p>
            <h2
              className="text-3xl md:text-4xl font-extrabold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              Start free. Scale when you&apos;re ready.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div
              className="rounded-lg p-6 space-y-5"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div>
                <p
                  className="text-xs uppercase tracking-wider font-bold"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  Free
                </p>
                <p className="mt-2">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    $0
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  "1 service bundle",
                  "2 proposals / month",
                  "1 CTO brief / month",
                  "Community support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#c8f135" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#login"
                onClick={scrollToLogin}
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  color: "#FFFFFF",
                  border: "1px solid #1E1E1E",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c8f135";
                  e.currentTarget.style.color = "#c8f135";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
              >
                Get Started
              </a>
            </div>

            {/* Pro — highlighted */}
            <div
              className="rounded-lg p-6 space-y-5 relative"
              style={{ background: "#0A0A0A", border: "2px solid #c8f135" }}
            >
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{
                  background: "#c8f135",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-display)",
                }}
              >
                Most Popular
              </div>
              <div>
                <p
                  className="text-xs uppercase tracking-wider font-bold"
                  style={{ color: "#c8f135", fontFamily: "var(--font-mono)" }}
                >
                  Pro
                </p>
                <p className="mt-2">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    $149
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  "10 service bundles",
                  "25 proposals / month",
                  "10 CTO briefs / month",
                  "Custom branding",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#c8f135" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#login"
                onClick={scrollToLogin}
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  background: "#c8f135",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
              >
                Start Free Trial
              </a>
            </div>

            {/* Enterprise */}
            <div
              className="rounded-lg p-6 space-y-5"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div>
                <p
                  className="text-xs uppercase tracking-wider font-bold"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  Enterprise
                </p>
                <p className="mt-2">
                  <span
                    className="text-4xl font-extrabold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    $399
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    /month
                  </span>
                </p>
              </div>
              <ul className="space-y-2">
                {[
                  "Unlimited bundles",
                  "Unlimited proposals",
                  "Unlimited CTO briefs",
                  "White-label exports",
                  "Team seats",
                  "Dedicated support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "#999999", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#c8f135" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="#login"
                onClick={scrollToLogin}
                className="block w-full h-10 flex items-center justify-center rounded text-sm font-bold uppercase tracking-wider transition-all"
                style={{
                  color: "#FFFFFF",
                  border: "1px solid #1E1E1E",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c8f135";
                  e.currentTarget.style.color = "#c8f135";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.color = "#FFFFFF";
                }}
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2
            className="text-3xl md:text-5xl font-extrabold leading-tight"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            Stop guessing. Start building{" "}
            <span style={{ color: "#c8f135" }}>profitable services.</span>
          </h2>
          <p
            className="text-base leading-relaxed max-w-xl mx-auto"
            style={{ color: "#999999", fontFamily: "var(--font-mono)" }}
          >
            Join MSPs who use Stackteryx to design, price, and sell services
            with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="#login"
              onClick={scrollToLogin}
              className="h-12 px-8 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: "#c8f135",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#d4f55c")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#c8f135")}
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#pricing"
              onClick={(e) => scrollToSection(e, "pricing")}
              className="h-12 px-8 flex items-center gap-2 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                color: "#FFFFFF",
                border: "1px solid #1E1E1E",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#c8f135";
                e.currentTarget.style.color = "#c8f135";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1E1E1E";
                e.currentTarget.style.color = "#FFFFFF";
              }}
            >
              View Pricing
            </a>
          </div>
          <p
            className="text-xs"
            style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
          >
            No credit card required. Free to start.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer
        className="py-12"
        style={{ background: "#0A0A0A", borderTop: "1px solid #1E1E1E" }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Column 1 — Brand */}
            <div className="col-span-2 md:col-span-1 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/stackteryx-logo.svg" alt="Stackteryx" height={24} style={{ height: 24, width: "auto" }} />
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                The service economics platform for MSPs.
              </p>
            </div>

            {/* Column 2 — Product */}
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-wider font-bold"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Product
              </p>
              {[
                { label: "How It Works", href: "#how-it-works" },
                { label: "Pricing", href: "#pricing" },
                { label: "Free CTO Brief", href: "/fractional-cto" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={href.startsWith("#") ? (e) => scrollToSection(e, href.slice(1)) : undefined}
                  className="block text-xs transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Column 3 — Platform */}
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-wider font-bold"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Platform
              </p>
              {[
                { label: "Service Builder", href: "#login" },
                { label: "Sales Studio", href: "#login" },
                { label: "Portfolio Intelligence", href: "#login" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  onClick={scrollToLogin}
                  className="block text-xs transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </a>
              ))}
            </div>

            {/* Column 4 — Legal */}
            <div className="space-y-2">
              <p
                className="text-xs uppercase tracking-wider font-bold"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Legal
              </p>
              {["Terms", "Privacy", "Contact"].map((label) => (
                <span
                  key={label}
                  className="block text-xs cursor-pointer transition-colors"
                  style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#c8f135")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div
            className="mt-8 pt-6 text-center"
            style={{ borderTop: "1px solid #1E1E1E" }}
          >
            <span
              className="text-xs"
              style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
            >
              &copy; 2025 Stackteryx. Built for MSPs.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

