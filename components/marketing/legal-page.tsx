interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px 60px" }}>
      <h1
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: "#FFFFFF",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.02em",
          marginBottom: 8,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "#666666",
          fontFamily: "var(--font-mono-alt)",
          marginBottom: 24,
        }}
      >
        Last updated: {lastUpdated}
      </p>
      <div
        style={{
          height: 1,
          background: "linear-gradient(to right, #c8f13540, transparent)",
          marginBottom: 40,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {children}
      </div>
    </div>
  );
}

interface LegalSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSection({ number, title, children }: LegalSectionProps) {
  return (
    <section>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: "#c8f135",
          fontFamily: "var(--font-display)",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        {number}. {title}
      </h2>
      <div
        style={{
          fontSize: 16,
          color: "#A7B0BE",
          lineHeight: 1.7,
          fontFamily: "var(--font-mono-alt)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

interface LegalSubSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

export function LegalSubSection({ number, title, children }: LegalSubSectionProps) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#FFFFFF",
          fontFamily: "var(--font-mono-alt)",
          marginBottom: 8,
        }}
      >
        {number} {title}
      </h3>
      <div
        style={{
          fontSize: 15,
          color: "#A7B0BE",
          lineHeight: 1.7,
          fontFamily: "var(--font-mono-alt)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
