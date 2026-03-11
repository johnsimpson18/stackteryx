import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-8"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <div className="max-w-md text-center">
        <h1
          className="text-3xl font-bold mb-3"
          style={{
            fontFamily: "var(--font-display)",
            color: "#A8FF3E",
            letterSpacing: "0.02em",
          }}
        >
          404 &mdash; PAGE NOT FOUND
        </h1>
        <p
          className="text-sm mb-8"
          style={{
            fontFamily: "var(--font-mono)",
            color: "#666666",
            lineHeight: 1.6,
          }}
        >
          This page doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-semibold"
          style={{
            backgroundColor: "#A8FF3E",
            color: "#0A0A0A",
            textDecoration: "none",
          }}
        >
          Go to Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
}
