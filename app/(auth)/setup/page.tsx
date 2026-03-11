"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setupProfile, getAuthDisplayName } from "@/actions/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Pre-populate display name from OAuth user metadata if available
  useEffect(() => {
    getAuthDisplayName().then((name) => {
      if (name) setDisplayName(name);
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await setupProfile({ display_name: displayName });
      if (result.success) {
        router.push("/dashboard");
      } else {
        toast.error(result.error);
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

        <div className="space-y-5">
          <div className="space-y-1">
            <h2
              className="text-xl font-bold uppercase tracking-wide"
              style={{ color: "#FFFFFF", fontFamily: "var(--font-display)" }}
            >
              WELCOME TO STACKTERYX
            </h2>
            <p
              className="text-xs"
              style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
            >
              Let&apos;s get your workspace ready.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="display_name"
                className="text-xs uppercase tracking-widest"
                style={{ color: "#666666", fontFamily: "var(--font-mono)" }}
              >
                FULL NAME
              </label>
              <input
                id="display_name"
                type="text"
                required
                minLength={2}
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3 rounded text-sm outline-none transition-all"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1E1E1E",
                  color: "#FFFFFF",
                  fontFamily: "var(--font-mono)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#A8FF3E";
                  e.currentTarget.style.boxShadow = "0 0 0 2px #A8FF3E25";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#1E1E1E";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isPending || displayName.trim().length < 2}
              className="w-full h-10 rounded text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: "#A8FF3E",
                color: "#0A0A0A",
                fontFamily: "var(--font-display)",
              }}
              onMouseEnter={(e) => {
                if (!isPending) e.currentTarget.style.background = "#BFFF5C";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#A8FF3E";
              }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </span>
              ) : (
                "CONTINUE →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
