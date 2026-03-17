"use client";

import { useEffect, useState } from "react";

// ── Service data ────────────────────────────────────────────────────────────

const SERVICES = [
  { name: "Zero-Trust Security", pct: 78, color: "#c8f135", delay: 0 },
  { name: "Fractional CTO", pct: 71, color: "#888", delay: 0.18 },
  { name: "BCDR Program", pct: 62, color: "#888", delay: 0.36 },
  { name: "HIPAA Compliance", pct: 55, color: "#888", delay: 0.54 },
];

const RISK_CARDS = [
  {
    badge: "High risk",
    badgeColor: "#e24b4a",
    title: "Identity governance gap",
    sub: "No MFA on admin accounts",
    subColor: "#444",
    bg: "#111",
    border: "#1e1e1e",
    delay: 0.1,
  },
  {
    badge: "Medium risk",
    badgeColor: "#ef9f27",
    title: "Backup recovery untested",
    sub: "Last verified: 4+ months ago",
    subColor: "#444",
    bg: "#111",
    border: "#1e1e1e",
    delay: 0.25,
  },
  {
    badge: "Opportunity",
    badgeColor: "#c8f135",
    title: "Advisory upsell ready",
    sub: "Brief generated — ready to send",
    subColor: "#c8f135",
    bg: "#0d1a00",
    border: "rgba(200,241,53,0.3)",
    delay: 0.4,
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export function HeroGraphic() {
  const [margin, setMargin] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [risk, setRisk] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    let mg = 0;
    let mr = 0;
    let rk = 0;
    const interval = setInterval(() => {
      mg = Math.min(mg + 1, 43);
      mr = Math.min(mr + 550, 24600);
      rk = Math.min(rk + 2, 74);
      setMargin(mg);
      setMrr(mr);
      setRisk(rk);
      if (mg >= 43 && mr >= 24600 && rk >= 74) clearInterval(interval);
    }, 35);

    setTimeout(() => setBarsVisible(true), 100);
    setTimeout(() => setCardsVisible(true), 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid #1e1e1e",
        borderRadius: 10,
        padding: 20,
        height: 400,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        position: "relative",
        overflow: "hidden",
      }}
      className="hero-graphic-outer"
    >
      {/* Grid texture */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 39px, #0d0d0d 39px, #0d0d0d 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #0d0d0d 39px, #0d0d0d 40px)",
        }}
      />

      {/* ── LEFT PANEL — Revenue Intelligence ────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#c8f135",
              display: "inline-block",
              animation: "hero-dot-pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 9,
              color: "#c8f135",
              fontFamily: "var(--font-mono-alt)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Portfolio intelligence
          </span>
        </div>

        {/* Metric card */}
        <div
          style={{
            background: "#0d1a00",
            border: "1px solid rgba(200,241,53,0.25)",
            borderRadius: 6,
            padding: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                color: "#666",
                fontFamily: "var(--font-mono-alt)",
                textTransform: "uppercase",
              }}
            >
              Avg margin
            </div>
            <div
              style={{
                fontSize: 32,
                color: "#c8f135",
                fontWeight: 800,
                fontFamily: "var(--font-mono-alt)",
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              {margin}%
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#666",
                fontFamily: "var(--font-mono-alt)",
                textTransform: "uppercase",
              }}
            >
              MRR
            </div>
            <div
              style={{
                fontSize: 20,
                color: "#fff",
                fontWeight: 800,
                fontFamily: "var(--font-mono-alt)",
                lineHeight: 1,
                marginTop: 2,
              }}
            >
              ${mrr.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Service margins card */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 6,
            padding: 12,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#444",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono-alt)",
              marginBottom: 10,
            }}
          >
            Service margins
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
              justifyContent: "center",
            }}
          >
            {SERVICES.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "#555",
                    width: 110,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-mono-alt)",
                  }}
                >
                  {s.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    background: "#1e1e1e",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: barsVisible ? `${s.pct}%` : "0%",
                      background: s.color,
                      borderRadius: 2,
                      transition: `width 1.1s ease ${s.delay}s`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: s.color,
                    fontFamily: "var(--font-mono-alt)",
                    fontWeight: 600,
                    width: 28,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {s.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Opportunity card */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1e1e1e",
            borderRadius: 6,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#444",
              textTransform: "uppercase",
              fontFamily: "var(--font-mono-alt)",
            }}
          >
            Top opportunity
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#fff",
              fontFamily: "var(--font-mono-alt)",
              marginTop: 4,
            }}
          >
            Fractional CTO Advisory
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#c8f135",
              fontFamily: "var(--font-mono-alt)",
              marginTop: 2,
            }}
          >
            +$1,500/mo upside identified
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — Advisory Signal ────────────────────────── */}
      <div
        className="hero-graphic-right"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          position: "relative",
          zIndex: 1,
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 9,
            color: "#888",
            fontFamily: "var(--font-mono-alt)",
            textTransform: "uppercase",
          }}
        >
          acmecorp.com — Q1 2026
        </div>

        {/* Risk cards */}
        {RISK_CARDS.map((card) => (
          <div
            key={card.badge}
            style={{
              background: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: 6,
              padding: 12,
              opacity: cardsVisible ? 1 : 0,
              transform: cardsVisible ? "translateY(0)" : "translateY(10px)",
              transition: `opacity 0.5s ease ${card.delay}s, transform 0.5s ease ${card.delay}s`,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: card.badgeColor,
                textTransform: "uppercase",
                fontFamily: "var(--font-mono-alt)",
                fontWeight: 600,
              }}
            >
              ● {card.badge}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#fff",
                fontFamily: "var(--font-mono-alt)",
                marginTop: 4,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontSize: 11,
                color: card.subColor,
                fontFamily: "var(--font-mono-alt)",
                marginTop: 2,
              }}
            >
              {card.sub}
            </div>
          </div>
        ))}

        {/* Bottom row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            opacity: cardsVisible ? 1 : 0,
            transform: cardsVisible ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 0.5s ease 0.55s, transform 0.5s ease 0.55s",
          }}
        >
          {/* Risk score */}
          <div
            style={{
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#444",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              Risk score
            </div>
            <div
              style={{
                fontSize: 24,
                color: "#e24b4a",
                fontWeight: 800,
                fontFamily: "var(--font-mono-alt)",
                lineHeight: 1,
                marginTop: 4,
              }}
            >
              {risk}
            </div>
          </div>

          {/* CTO Brief export */}
          <div
            style={{
              background: "#0d1a00",
              border: "1px solid rgba(200,241,53,0.3)",
              borderRadius: 6,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#c8f135",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              CTO Brief
            </div>
            <div
              style={{
                background: "#c8f135",
                color: "#1a2e00",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "var(--font-mono-alt)",
                padding: "5px 8px",
                borderRadius: 3,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              EXPORT →
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe for dot pulse */}
      <style>{`
        @keyframes hero-dot-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @media (max-width: 767px) {
          .hero-graphic-outer {
            grid-template-columns: 1fr !important;
          }
          .hero-graphic-right {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
