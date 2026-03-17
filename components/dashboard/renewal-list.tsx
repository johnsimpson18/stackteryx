"use client";

import Link from "next/link";

export interface RenewalItem {
  clientId: string;
  clientName: string;
  endDate: string;
  contractValue?: number;
}

interface RenewalListProps {
  renewals: RenewalItem[];
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function daysColor(days: number): string {
  if (days <= 30) return "#e24b4a";
  if (days <= 60) return "#ef9f27";
  return "#666666";
}

export function RenewalList({ renewals }: RenewalListProps) {
  if (renewals.length === 0) {
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
        No renewals due in the next 90 days.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {renewals.map((r) => {
        const days = daysUntil(r.endDate);
        const label = days <= 0 ? "overdue" : `in ${days} days`;

        return (
          <div
            key={r.clientId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: "1px solid #1e1e1e",
            }}
          >
            {/* Client name */}
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: "#ffffff",
                fontFamily: "var(--font-mono-alt)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.clientName}
            </span>

            {/* Days until renewal */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: daysColor(days),
                fontFamily: "var(--font-mono-alt)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>

            {/* Contract value */}
            {r.contractValue != null && (
              <span
                style={{
                  fontSize: 12,
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                  whiteSpace: "nowrap",
                }}
              >
                $
                {r.contractValue.toLocaleString("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
            )}

            {/* View link */}
            <Link
              href={`/clients/${r.clientId}`}
              style={{
                fontSize: 12,
                color: "#c8f135",
                fontFamily: "var(--font-mono-alt)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              View →
            </Link>
          </div>
        );
      })}
    </div>
  );
}
