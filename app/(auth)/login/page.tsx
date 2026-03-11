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
import { Mail, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   STACKTERYX LANDING PAGE
   Industrial-premium marketing + login entry point.
   ───────────────────────────────────────────────────────────── */

// ── Inline SVG icons for feature section ─────────────────────

function IconStack() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L28 10L16 16L4 10L16 4Z" stroke="#A8FF3E" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 16L16 22L28 16" stroke="#A8FF3E" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 22L16 28L28 22" stroke="#A8FF3E" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="20" height="24" rx="2" stroke="#A8FF3E" strokeWidth="1.5" />
      <line x1="10" y1="11" x2="22" y2="11" stroke="#A8FF3E" strokeWidth="1.5" />
      <line x1="10" y1="15.5" x2="22" y2="15.5" stroke="#A8FF3E" strokeWidth="1.5" />
      <line x1="10" y1="20" x2="17" y2="20" stroke="#A8FF3E" strokeWidth="1.5" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="18" width="5" height="10" rx="1" stroke="#A8FF3E" strokeWidth="1.5" />
      <rect x="13.5" y="12" width="5" height="16" rx="1" stroke="#A8FF3E" strokeWidth="1.5" />
      <rect x="22" y="6" width="5" height="22" rx="1" stroke="#A8FF3E" strokeWidth="1.5" />
    </svg>
  );
}

// ── HIPAA bundle spreadsheet data (the painful way) ──────────

const spreadsheetRows = [
  { tool: "CrowdStrike Falcon", cost: "$4.20/ep", sell: "$7.00/ep", margin: "40.0%", notes: "" },
  { tool: "Mimecast Email Sec", cost: "$3.10/u",  sell: "$5.50/u",  margin: "43.6%", notes: "" },
  { tool: "Datto Backup",      cost: "$2.80/ep", sell: "$4.75/ep", margin: "41.1%", notes: "" },
  { tool: "KnowBe4 Training",  cost: "$1.90/u",  sell: "$3.25/u",  margin: "41.5%", notes: "" },
  { tool: "Huntress MDR",      cost: "$3.50/ep", sell: "$6.00/ep", margin: "41.7%", notes: "" },
];

// ── HIPAA bundle card data (the Stackteryx way) ──────────────

const bundleTools = [
  { name: "CrowdStrike Falcon", category: "Endpoint", color: "#3B82F6", price: "$7.00/ep" },
  { name: "Mimecast Email Sec", category: "Email",    color: "#A855F7", price: "$5.50/u" },
  { name: "Datto Backup",       category: "Backup",   color: "#F59E0B", price: "$4.75/ep" },
  { name: "KnowBe4 Training",   category: "Training", color: "#10B981", price: "$3.25/u" },
  { name: "Huntress MDR",       category: "MDR",      color: "#EF4444", price: "$6.00/ep" },
];

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

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0A", scrollPaddingTop: "80px" }}>

      {/* ═══════════════════════════════════════════════════════
          NAVIGATION BAR — sticky, authoritative
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
            href="#login"
            onClick={scrollToLogin}
            className="h-8 px-4 flex items-center rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              color: "#FFFFFF",
              border: "1px solid #1E1E1E",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#A8FF3E";
              e.currentTarget.style.color = "#A8FF3E";
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
              background: "#A8FF3E",
              color: "#0A0A0A",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#BFFF5C")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#A8FF3E")}
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
            "linear-gradient(#A8FF3E08 1px, transparent 1px), linear-gradient(90deg, #A8FF3E08 1px, transparent 1px)",
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
                style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)", animationDelay: "0ms" }}
              >
                THE MSSP OPERATING SYSTEM
              </p>

              <h1
                className="text-[48px] md:text-[72px] lg:text-[88px] font-extrabold leading-[0.95] uppercase tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="landing-word block" style={{ color: "#FFFFFF", animationDelay: "0ms" }}>
                  DESIGN PROFITABLE
                </span>
                <span
                  className="landing-word landing-glow-text block"
                  style={{ color: "#A8FF3E", animationDelay: "80ms" }}
                >
                  SECURITY SERVICES.
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
                The platform where managed security services are architected — from the
                business outcome they deliver, down to the vendor cost that makes them
                profitable. With an AI layer that reasons through the process on your behalf.
              </p>

              {/* Five-layer framework chips */}
              <div
                className="landing-fade-in flex flex-wrap items-center gap-2 pt-1"
                style={{ animationDelay: "450ms" }}
              >
                {["OUTCOME", "SERVICE", "STACK", "COST", "COMMERCIAL"].map((layer, i) => (
                  <div key={layer} className="flex items-center gap-2">
                    <span
                      className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded font-bold"
                      style={{
                        background: "#A8FF3E10",
                        border: "1px solid #A8FF3E30",
                        color: "#A8FF3E",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {layer}
                    </span>
                    {i < 4 && (
                      <span style={{ color: "#A8FF3E40", fontSize: "10px" }}>→</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Stat row */}
              <div
                className="landing-fade-in flex flex-wrap gap-6 pt-2"
                style={{ animationDelay: "550ms" }}
              >
                {[
                  "Vendor agnostic",
                  "5-layer service architecture",
                  "AI-generated proposals",
                ].map((stat) => (
                  <div
                    key={stat}
                    className="text-xs uppercase tracking-widest font-semibold"
                    style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
                  >
                    {stat}
                  </div>
                ))}
              </div>
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
          SECTION 2 — THE SPREADSHEET PROBLEM
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: "#111111" }} className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">

          {/* Section eyebrow + headline */}
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE PROBLEM
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-8"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            MOST MSPS ARE RUNNING THEIR<br />
            SECURITY BUSINESS<br />
            <span style={{ color: "#666666" }}>IN A SPREADSHEET.</span>
          </h2>

          {/* Pain point cards — 2×2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16 md:mb-20">
            {[
              { title: "Hidden margin risk", desc: "A vendor price increase silently erodes your margin across every affected service." },
              { title: "Inconsistent proposals", desc: "Every rep quotes differently. No two clients see the same service." },
              { title: "Tool sprawl", desc: "Nobody knows which tools are actually assigned to which services." },
              { title: "Services that don\u2019t scale", desc: "You can\u2019t package, replicate, or sell what only exists in a spreadsheet." },
            ].map((pain) => (
              <div
                key={pain.title}
                className="flex items-start gap-3 rounded-lg px-4 py-3.5"
                style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: "#EF4444" }}
                />
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    {pain.title}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    {pain.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Two-column comparison — same HIPAA bundle, two worlds */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Left — The old way (fake Excel spreadsheet) */}
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em] mb-4 font-bold"
                style={{ color: "#EF4444", fontFamily: "var(--font-mono)" }}
              >
                YOUR CURRENT SYSTEM
              </p>
              <div
                className="landing-scanline rounded overflow-hidden"
                style={{ border: "1px solid #C0C0C0" }}
              >
                <table
                  className="w-full text-[11px] border-collapse"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <thead>
                    <tr style={{ background: "#E8E8E8" }}>
                      {["Tool Name", "Cost/Mo", "Sell/Mo", "Margin%", "Notes"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-2.5 py-1.5 font-normal"
                          style={{
                            color: "#333333",
                            border: "1px solid #C0C0C0",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {spreadsheetRows.map((row) => (
                      <tr key={row.tool}>
                        <td
                          className="px-2.5 py-1.5"
                          style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#FAFAFA" }}
                        >
                          {row.tool}
                        </td>
                        <td
                          className="px-2.5 py-1.5"
                          style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#FAFAFA" }}
                        >
                          {row.cost}
                        </td>
                        <td
                          className="px-2.5 py-1.5"
                          style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#FAFAFA" }}
                        >
                          {row.sell}
                        </td>
                        <td
                          className="px-2.5 py-1.5"
                          style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#FAFAFA" }}
                        >
                          {row.margin}
                        </td>
                        <td
                          className="px-2.5 py-1.5"
                          style={{ color: "#999999", border: "1px solid #D0D0D0", background: "#FAFAFA" }}
                        >
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                    {/* TOTAL row — the broken formula */}
                    <tr style={{ fontWeight: 600 }}>
                      <td
                        className="px-2.5 py-2"
                        style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#F0F0F0" }}
                      >
                        TOTAL
                      </td>
                      <td
                        className="px-2.5 py-2"
                        style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#F0F0F0" }}
                      >
                        $15.50
                      </td>
                      <td
                        className="px-2.5 py-2"
                        style={{ color: "#333333", border: "1px solid #D0D0D0", background: "#F0F0F0" }}
                      >
                        $26.50
                      </td>
                      <td
                        className="px-2.5 py-2 text-[12px]"
                        style={{
                          border: "1px solid #D0D0D0",
                          background: "#FEE2E2",
                          color: "#DC2626",
                          fontWeight: 700,
                        }}
                      >
                        #REF!
                      </td>
                      <td
                        className="px-2.5 py-2"
                        style={{
                          color: "#999999",
                          border: "1px solid #D0D0D0",
                          background: "#F0F0F0",
                          fontSize: "9px",
                        }}
                      >
                        =B8/C8
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                className="text-[10px] mt-3"
                style={{ color: "#EF444490", fontFamily: "var(--font-mono)" }}
              >
                Last edited by Mike · 47 versions · pricing_FINAL_v3_ACTUAL_FINAL.xlsx
              </p>
            </div>

            {/* Right — The Stackteryx way (HIPAA bundle card) */}
            <div>
              <p
                className="text-xs uppercase tracking-[0.2em] mb-4 font-bold"
                style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
              >
                WITH STACKTERYX
              </p>
              <div
                className="rounded-lg overflow-hidden"
                style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
              >
                {/* Card header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3
                        className="text-base font-bold uppercase tracking-wide"
                        style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                      >
                        HIPAA COMPLIANCE BUNDLE
                      </h3>
                      <p
                        className="text-[10px] mt-1"
                        style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                      >
                        5 tools · Updated today
                      </p>
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-widest px-2 py-1 rounded font-bold"
                      style={{
                        background: "#A8FF3E15",
                        color: "#A8FF3E",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Tool list */}
                <div style={{ fontFamily: "var(--font-mono)" }}>
                  {bundleTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center justify-between px-5 py-2.5"
                      style={{ borderTop: "1px solid #1E1E1E" }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ background: tool.color }}
                        />
                        <span className="text-xs" style={{ color: "#CCCCCC" }}>
                          {tool.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px]" style={{ color: "#555555" }}>
                          {tool.category}
                        </span>
                        <span className="text-xs" style={{ color: "#FFFFFF" }}>
                          {tool.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom metrics */}
                <div
                  className="px-5 py-4 flex items-center justify-between flex-wrap gap-4"
                  style={{ borderTop: "1px solid #1E1E1E", background: "#0D0D0D" }}
                >
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: "#555555", fontFamily: "var(--font-mono)" }}>
                        Monthly Cost
                      </p>
                      <p className="text-sm font-bold" style={{ color: "#CCCCCC", fontFamily: "var(--font-mono)" }}>
                        $15.50
                      </p>
                    </div>
                    <span style={{ color: "#333333" }}>→</span>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest" style={{ color: "#555555", fontFamily: "var(--font-mono)" }}>
                        Sell Price
                      </p>
                      <p className="text-sm font-bold" style={{ color: "#CCCCCC", fontFamily: "var(--font-mono)" }}>
                        $26.50
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: "#555555", fontFamily: "var(--font-mono)" }}>
                      Margin
                    </p>
                    <p
                      className="text-2xl font-extrabold"
                      style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
                    >
                      41.5%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-14 md:mt-20">
            <a
              href="#import"
              className="inline-flex items-center gap-2 text-sm font-bold transition-colors"
              style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#BFFF5C")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A8FF3E")}
            >
              Import your existing spreadsheet → takes less than 2 minutes
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE FIVE-LAYER MODEL
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#0A0A0A" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE ARCHITECTURE
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-6"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            SECURITY SERVICES SHOULD BE<br />
            DESIGNED LIKE PRODUCTS.
          </h2>
          <p
            className="text-sm leading-relaxed text-center max-w-2xl mx-auto mb-16"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Every service in Stackteryx is built across five layers — in sequence.
            You cannot skip ahead. The platform enforces the order because the order is the discipline.
          </p>

          {/* Five layers vertical stack */}
          <div className="max-w-2xl mx-auto space-y-0">
            {[
              { num: "01", name: "OUTCOME", desc: "Define the business result the client is paying for — before you select a single tool." },
              { num: "02", name: "SERVICE", desc: "Define the capabilities this service delivers. What does the MSP actually do?" },
              { num: "03", name: "STACK", desc: "Assign the tools that power each capability. Every tool has a domain, a cost, and a purpose." },
              { num: "04", name: "ECONOMICS", desc: "Calculate the true cost floor — tools, labor, overhead. See the margin before you set the price." },
              { num: "05", name: "COMMERCIAL", desc: "Generate the pricing configuration, the proposal, and the sales playbook. Automated." },
            ].map((layer, i) => (
              <div key={layer.num} className="flex items-start gap-6 relative">
                {/* Connecting line */}
                {i < 4 && (
                  <div
                    className="absolute left-[15px] top-[40px] w-px h-[calc(100%)]"
                    style={{ background: "#1E1E1E" }}
                  />
                )}
                {/* Number */}
                <div
                  className="flex-shrink-0 w-[32px] h-[32px] rounded-full flex items-center justify-center text-[11px] font-bold relative z-10"
                  style={{
                    background: "#A8FF3E10",
                    border: "1px solid #A8FF3E30",
                    color: "#A8FF3E",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {layer.num}
                </div>
                {/* Content */}
                <div className="pb-8">
                  <h3
                    className="text-base font-extrabold uppercase tracking-wide mb-1"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    {layer.name}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    {layer.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p
            className="text-center mt-8 text-sm"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            Stackteryx turns this process into a repeatable system.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — PLATFORM OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#111111" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE PLATFORM
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-16"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            THE PLATFORM FOR MANAGED<br />
            SERVICE ECONOMICS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <IconStack />,
                name: "SERVICE ARCHITECTURE",
                desc: "Design standardized security services using the five-layer model. Every service has an outcome, capabilities, a stack, a cost floor, and a price — modeled automatically. One path to creating a service. No more ad-hoc quoting.",
              },
              {
                icon: <IconChart />,
                name: "MARGIN INTELLIGENCE",
                desc: "Know the true cost of every service — vendor costs, labor, and overhead rolled into a single cost floor. When a vendor raises prices, Stackteryx flags every affected service and shows you the margin impact before your next renewal.",
              },
              {
                icon: <IconDoc />,
                name: "SALES ENABLEMENT",
                desc: "Generate outcome-anchored proposals and full sales playbooks for every service — talk tracks, objection responses, email templates, and ICP profiles. All in business language. No tool names in the headline.",
              },
            ].map((feat) => (
              <div
                key={feat.name}
                className="rounded-lg p-6 space-y-4"
                style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
              >
                <div
                  className="h-14 w-14 rounded-lg flex items-center justify-center"
                  style={{ background: "#A8FF3E10", border: "1px solid #A8FF3E20" }}
                >
                  {feat.icon}
                </div>
                <h3
                  className="text-lg font-extrabold uppercase tracking-wide"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  {feat.name}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — AI INTELLIGENCE
          ═══════════════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28"
        style={{
          background: "#0A0A0A",
          backgroundImage:
            "linear-gradient(#A8FF3E08 1px, transparent 1px), linear-gradient(90deg, #A8FF3E08 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE INTELLIGENCE LAYER
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-6"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            YOUR AI ADVISOR FOR<br />
            SERVICE ECONOMICS
          </h2>
          <p
            className="text-sm leading-relaxed text-center max-w-2xl mx-auto mb-16"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Stackteryx doesn&apos;t have a chatbot. The AI operates as three distinct
            agents — each responsible for a specific part of the service business.
            They run continuously, surface issues proactively, and generate outputs
            the user reviews and approves.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                name: "SERVICE ARCHITECT",
                desc: "When you start a new service, the AI reasons from the outcome downward through all five layers. It suggests capabilities, recommends stack tools, estimates a cost floor, and flags margin risk — before you\u2019ve manually configured anything.",
              },
              {
                num: "02",
                name: "PORTFOLIO INTELLIGENCE ENGINE",
                desc: "Always-on awareness of your entire service portfolio. Knows which services are incomplete, which clients are on services with eroding margins, and when a vendor cost change creates a ripple effect. Surfaces these as actionable items on your Dashboard.",
              },
              {
                num: "03",
                name: "PROPOSAL AGENT",
                desc: "Given a client or prospect, the Proposal Agent generates a complete, outcome-anchored proposal without being asked. It writes the executive summary, service overviews, pricing rationale, and why-us section. You review and send.",
              },
            ].map((agent) => (
              <div key={agent.num} className="space-y-4">
                <span
                  className="text-[32px] font-extrabold"
                  style={{ color: "#1E1E1E", fontFamily: "var(--font-display)" }}
                >
                  {agent.num}
                </span>
                <h3
                  className="text-base font-extrabold uppercase tracking-wide"
                  style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
                >
                  {agent.name}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                >
                  {agent.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#111111" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE WORKFLOW
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-16"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            FROM OUTCOME TO PROPOSAL<br />
            IN MINUTES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {[
              { num: "1", title: "DEFINE THE OUTCOME", desc: "What business result does this service deliver? Risk reduction, compliance, revenue protection, or productivity." },
              { num: "2", title: "DESIGN THE SERVICE", desc: "What capabilities does it include? The AI suggests them based on the outcome. You confirm." },
              { num: "3", title: "SELECT THE STACK", desc: "Which tools power each capability? Choose from your catalog or the built-in library of 40+ vendors." },
              { num: "4", title: "MODEL THE COST", desc: "Your cost floor is calculated automatically from tool costs, labor, and overhead. No formulas." },
              { num: "5", title: "SET THE PRICE", desc: "The AI suggests a price at your target margin. You adjust. The margin updates in real time." },
              { num: "6", title: "GENERATE THE PROPOSAL", desc: "One click. A complete, outcome-anchored client proposal — ready to send in under 60 seconds." },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <span
                  className="flex-shrink-0 text-[28px] font-extrabold leading-none"
                  style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
                >
                  {step.num}
                </span>
                <div>
                  <h3
                    className="text-sm font-extrabold uppercase tracking-wide mb-1.5"
                    style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — VENDOR ECOSYSTEM
          ═══════════════════════════════════════════════════════ */}
      <section
        className="py-20 md:py-28"
        style={{
          background: "#0A0A0A",
          backgroundImage:
            "linear-gradient(#A8FF3E08 1px, transparent 1px), linear-gradient(90deg, #A8FF3E08 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            THE STACK
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-6"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            BUILT FOR THE SECURITY TOOLS<br />
            MSPS ALREADY USE
          </h2>
          <p
            className="text-sm leading-relaxed text-center max-w-2xl mx-auto mb-16"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Your vendor catalog powers your cost modeling. When a vendor raises prices,
            every affected service gets flagged automatically.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
            {[
              "CrowdStrike", "SentinelOne", "Huntress", "Microsoft", "Okta", "Cisco",
              "Mimecast", "Proofpoint", "Datto", "Veeam", "Acronis", "KnowBe4",
              "Palo Alto Networks", "Fortinet", "SonicWall", "Zscaler", "Wiz", "Varonis",
              "Splunk", "Microsoft Sentinel", "Rapid7", "Tenable", "Qualys", "CyberArk",
            ].map((vendor) => (
              <div
                key={vendor}
                className="px-3 py-2.5 rounded text-center text-[11px] font-medium transition-colors cursor-default"
                style={{
                  background: "#111111",
                  border: "1px solid #1E1E1E",
                  color: "#888888",
                  fontFamily: "var(--font-mono)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#A8FF3E40";
                  e.currentTarget.style.color = "#CCCCCC";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.color = "#888888";
                }}
              >
                {vendor}
              </div>
            ))}
          </div>

          <p
            className="text-center mt-8 text-[11px]"
            style={{ color: "#555555", fontFamily: "var(--font-mono)" }}
          >
            + 12 more vendors in the built-in library. Import any vendor not listed.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — MARGIN VISIBILITY
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28" style={{ background: "#111111" }}>
        <div className="max-w-7xl mx-auto px-6">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4 text-center"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            MARGIN INTELLIGENCE
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight text-center mb-16"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            KNOW THE MARGIN OF EVERY<br />
            SERVICE. ALL THE TIME.
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left copy */}
            <div className="space-y-6">
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Most MSPs don&apos;t know their true service margin until the quarter ends.
                Stackteryx calculates it continuously — across tool costs, labor allocation,
                and overhead — so you always know which services are profitable and which
                are quietly bleeding.
              </p>

              <div className="space-y-3">
                {[
                  "True cost floor calculated from real vendor pricing",
                  "Margin updates automatically when vendor costs change",
                  "Red zone alerts when margin drops below your threshold",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-2">
                    <span style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }} className="text-sm flex-shrink-0">→</span>
                    <span
                      className="text-sm"
                      style={{ color: "#999999", fontFamily: "var(--font-mono)" }}
                    >
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Mock margin display */}
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "#0A0A0A", border: "1px solid #1E1E1E" }}
            >
              <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                <h3
                  className="text-sm font-bold uppercase tracking-wide"
                  style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
                >
                  HIPAA COMPLIANCE BUNDLE
                </h3>
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-1 rounded font-bold"
                  style={{
                    background: "#A8FF3E15",
                    color: "#A8FF3E",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ACTIVE
                </span>
              </div>
              <div style={{ borderTop: "1px solid #1E1E1E" }}>
                {[
                  { label: "Cost Floor", value: "$15.50/user" },
                  { label: "Sell Price", value: "$26.50/user" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-5 py-3"
                    style={{ borderBottom: "1px solid #1E1E1E" }}
                  >
                    <span
                      className="text-xs uppercase tracking-widest"
                      style={{ color: "#555555", fontFamily: "var(--font-mono)" }}
                    >
                      {row.label}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: "#CCCCCC", fontFamily: "var(--font-mono)" }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-4">
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: "#555555", fontFamily: "var(--font-mono)" }}
                  >
                    Margin
                  </span>
                  <span
                    className="text-3xl font-extrabold"
                    style={{ color: "#A8FF3E", fontFamily: "var(--font-display)" }}
                  >
                    41.5%
                  </span>
                </div>
              </div>
              {/* Red zone indicator */}
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid #1E1E1E", background: "#0D0D0D" }}
              >
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "#EF444480", fontFamily: "var(--font-mono)" }}
                >
                  Red zone threshold: 25%
                </span>
                <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E1E1E" }}>
                  <div className="h-full rounded-full" style={{ width: "25%", background: "#EF444450" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — SPREADSHEET IMPORT
          ═══════════════════════════════════════════════════════ */}
      <section
        id="import"
        className="py-20 md:py-28"
        style={{
          background: "#0A0A0A",
          scrollMarginTop: "80px",
          backgroundImage:
            "linear-gradient(#A8FF3E08 1px, transparent 1px), linear-gradient(90deg, #A8FF3E08 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p
            className="text-xs uppercase tracking-[0.3em] mb-4"
            style={{ color: "#A8FF3E", fontFamily: "var(--font-mono)" }}
          >
            MIGRATION
          </p>
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight mb-6"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            IMPORT YOUR EXISTING<br />
            PRICING SPREADSHEET
          </h2>
          <p
            className="text-sm leading-relaxed max-w-xl mx-auto mb-12"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Already have your vendor pricing in a spreadsheet? Upload it and Stackteryx
            converts it into structured services automatically. Takes less than 2 minutes.
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8 mb-10">
            {[
              "1. Upload your CSV or PDF pricing sheet",
              "2. Stackteryx maps tools to vendors and domains",
              "3. Your stack catalog is ready — start building services",
            ].map((step) => (
              <p
                key={step}
                className="text-xs"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                {step}
              </p>
            ))}
          </div>

          <a
            href="#login"
            onClick={scrollToLogin}
            className="inline-flex items-center gap-2 h-11 px-6 rounded text-sm font-bold uppercase tracking-wider transition-all"
            style={{
              background: "#A8FF3E",
              color: "#0A0A0A",
              fontFamily: "var(--font-display)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#BFFF5C")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#A8FF3E")}
          >
            Import My Spreadsheet
            <ArrowRight className="h-4 w-4" />
          </a>

          <p
            className="mt-4 text-[10px]"
            style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
          >
            Supported formats: CSV, Excel (.xlsx), PDF
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 10 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="py-24 md:py-32" style={{ background: "#111111" }}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2
            className="text-[36px] md:text-[56px] lg:text-[72px] font-extrabold leading-[0.95] uppercase tracking-tight mb-6"
            style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
          >
            STOP RUNNING YOUR SECURITY<br />
            SERVICES BUSINESS<br />
            IN A SPREADSHEET.
          </h2>
          <p
            className="text-sm mb-10"
            style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
          >
            Start designing profitable services today.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="#login"
              onClick={scrollToLogin}
              className="inline-flex items-center gap-2 h-11 px-6 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                background: "#A8FF3E",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#BFFF5C")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#A8FF3E")}
            >
              Create Your Account
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#login"
              onClick={scrollToLogin}
              className="inline-flex items-center h-11 px-6 rounded text-sm font-bold uppercase tracking-wider transition-all"
              style={{
                border: "1px solid #1E1E1E",
                color: "#FFFFFF",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#A8FF3E";
                e.currentTarget.style.color = "#A8FF3E";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#1E1E1E";
                e.currentTarget.style.color = "#FFFFFF";
              }}
            >
              Sign In
            </a>
          </div>

          <p
            className="mt-6 text-[10px]"
            style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
          >
            No credit card required. Free to start.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════ */}
      <footer
        className="py-8"
        style={{ background: "#0A0A0A", borderTop: "1px solid #1E1E1E" }}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stackteryx-logo.svg" alt="Stackteryx" height={24} style={{ height: 24, width: "auto" }} />
          <div className="flex gap-4">
            <span
              className="text-xs cursor-pointer transition-colors"
              style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
            >
              Terms
            </span>
            <span
              className="text-xs cursor-pointer transition-colors"
              style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
            >
              Privacy
            </span>
            <span
              className="text-xs cursor-pointer transition-colors"
              style={{ color: "#444444", fontFamily: "var(--font-mono)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#666666")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#444444")}
            >
              Contact
            </span>
          </div>
          <span
            className="text-xs"
            style={{ color: "#333333", fontFamily: "var(--font-mono)" }}
          >
            &copy; 2025 Stackteryx. Built for MSSPs.
          </span>
        </div>
      </footer>
    </div>
  );
}
