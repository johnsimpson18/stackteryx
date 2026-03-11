"use client";

import Link from "next/link";

export default function DashboardError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-8"
      style={{ minHeight: "60vh" }}
    >
      <div className="max-w-md text-center">
        <h1
          className="text-2xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-display)",
            color: "#A8FF3E",
            letterSpacing: "0.02em",
          }}
        >
          DASHBOARD ERROR
        </h1>
        <p
          className="text-sm mb-8"
          style={{
            fontFamily: "var(--font-mono)",
            color: "#666666",
            lineHeight: 1.6,
          }}
        >
          We couldn&apos;t load your portfolio data.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-lg px-6 py-2.5 text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: "#A8FF3E", color: "#0A0A0A" }}
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border px-6 py-2.5 text-sm font-medium"
            style={{
              color: "#999999",
              borderColor: "#333333",
              textDecoration: "none",
            }}
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
