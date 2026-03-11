"use client";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0A0A0A",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "var(--font-display), system-ui, sans-serif",
                fontSize: 32,
                fontWeight: 700,
                color: "#A8FF3E",
                letterSpacing: "0.02em",
                marginBottom: 16,
              }}
            >
              SOMETHING WENT WRONG
            </h1>
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontSize: 14,
                color: "#666666",
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              An unexpected error occurred. Our team has been notified.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={reset}
                style={{
                  backgroundColor: "#A8FF3E",
                  color: "#0A0A0A",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <a
                href="/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  backgroundColor: "transparent",
                  color: "#999999",
                  border: "1px solid #333333",
                  borderRadius: 8,
                  padding: "10px 24px",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
