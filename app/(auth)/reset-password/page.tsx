"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/actions/auth";
import { Loader2, Eye, EyeOff, Check } from "lucide-react";

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

// ── Shared styles ────────────────────────────────────────────

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

function handleFocusRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#A8FF3E";
  e.currentTarget.style.boxShadow = "0 0 0 2px #A8FF3E25";
}
function handleBlurRing(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#1E1E1E";
  e.currentTarget.style.boxShadow = "none";
}

// ── Password input with show/hide ────────────────────────────

function PasswordInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
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

// ── Main page ────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirm;
  const canSubmit = strength === 4 && passwordsMatch;

  // Redirect to dashboard after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => router.push("/dashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    startTransition(async () => {
      const result = await updatePassword(password);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0A0A0A" }}
    >
      <div
        className="w-full max-w-md rounded-lg p-6 relative"
        style={{ background: "#111111", border: "1px solid #1E1E1E" }}
      >
        {/* Top glow line */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, #A8FF3E60, transparent)",
          }}
        />

        {/* Logo */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stackteryx-logo.svg" alt="Stackteryx" height={32} style={{ height: 32, width: "auto", display: "inline-block" }} />
        </div>

        {success ? (
          <div className="text-center space-y-5 py-4">
            <div className="flex justify-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "#A8FF3E15" }}
              >
                <Check className="h-7 w-7" style={{ color: "#A8FF3E" }} />
              </div>
            </div>
            <h3
              className="text-lg font-bold"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              PASSWORD UPDATED
            </h3>
            <p
              className="text-sm"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            >
              Redirecting you to your dashboard...
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2
                className="text-xl font-bold uppercase tracking-wide"
                style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
              >
                SET NEW PASSWORD
              </h2>
              <p
                className="text-xs"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                Choose a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PasswordInput
                  id="new-password"
                  label="NEW PASSWORD"
                  value={password}
                  onChange={setPassword}
                />
                {/* Strength bar */}
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
              </div>

              <div>
                <PasswordInput
                  id="confirm-password"
                  label="CONFIRM PASSWORD"
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    if (!confirmTouched) setConfirmTouched(true);
                  }}
                />
                {confirmTouched && confirm && !passwordsMatch && (
                  <p
                    className="mt-1"
                    style={{ color: "#EF4444", fontFamily: "var(--font-mono)", fontSize: 11 }}
                  >
                    Passwords don&apos;t match
                  </p>
                )}
              </div>

              {error && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  <p style={{ color: "#EF4444" }}>{error}</p>
                  {(error.includes("expired") || error.includes("invalid")) && (
                    <a
                      href="/login?mode=forgot"
                      className="text-xs transition-colors mt-1 inline-block"
                      style={{ color: "#666666" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#A8FF3E")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
                    >
                      Request a new reset link →
                    </a>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full h-10 rounded text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                style={{
                  background: "#A8FF3E",
                  color: "#0A0A0A",
                  fontFamily: "var(--font-display)",
                }}
                onMouseEnter={(e) => {
                  if (!isPending && canSubmit) e.currentTarget.style.background = "#BFFF5C";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#A8FF3E";
                }}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "UPDATE PASSWORD"
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
