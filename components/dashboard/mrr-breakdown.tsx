"use client";

export interface MRRServiceItem {
  serviceId: string;
  serviceName: string;
  mrr: number;
  margin: number;
}

interface MRRBreakdownProps {
  services: MRRServiceItem[];
  totalMrr: number;
}

function marginColor(margin: number): string {
  if (margin >= 0.4) return "#c8f135";
  if (margin >= 0.25) return "#ef9f27";
  return "#e24b4a";
}

export function MRRBreakdown({ services, totalMrr }: MRRBreakdownProps) {
  if (services.length === 0) {
    return (
      <p
        style={{
          fontSize: 13,
          color: "#444444",
          fontFamily: "var(--font-mono-alt)",
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        Add services with pricing to see revenue breakdown.
      </p>
    );
  }

  const maxMrr = Math.max(...services.map((s) => s.mrr), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {services.map((service, i) => {
        const barPct = (service.mrr / maxMrr) * 100;
        const barColor = i === 0 ? "#c8f135" : "#555555";

        return (
          <div
            key={service.serviceId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Service name */}
            <span
              style={{
                width: 140,
                flexShrink: 0,
                fontSize: 13,
                color: "#888888",
                fontFamily: "var(--font-mono-alt)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {service.serviceName}
            </span>

            {/* Bar */}
            <div
              style={{
                flex: 1,
                height: 6,
                background: "#1e1e1e",
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${barPct}%`,
                  background: barColor,
                  borderRadius: 3,
                  transition: "width 0.8s ease",
                }}
              />
            </div>

            {/* MRR value */}
            <span
              style={{
                width: 80,
                flexShrink: 0,
                textAlign: "right",
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              $
              {service.mrr.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>

            {/* Margin */}
            <span
              style={{
                width: 44,
                flexShrink: 0,
                textAlign: "right",
                fontSize: 12,
                fontWeight: 600,
                color: marginColor(service.margin),
                fontFamily: "var(--font-mono-alt)",
              }}
            >
              {(service.margin * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}

      {/* Total */}
      <div
        style={{
          borderTop: "1px solid #1e1e1e",
          paddingTop: 10,
          marginTop: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#666666",
            fontFamily: "var(--font-mono-alt)",
            textTransform: "uppercase",
          }}
        >
          Total MRR
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "#c8f135",
            fontFamily: "var(--font-mono-alt)",
          }}
        >
          $
          {totalMrr.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </span>
      </div>
    </div>
  );
}
