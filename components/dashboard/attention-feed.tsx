"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Brain,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AttentionItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  cta: { label: string; href: string };
  category: "pricing" | "client" | "advisory" | "intelligence";
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#e24b4a",
  warning: "#ef9f27",
  info: "#378add",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pricing: DollarSign,
  client: Users,
  advisory: Brain,
  intelligence: Lightbulb,
};

interface AttentionFeedProps {
  items: AttentionItem[];
}

export function AttentionFeed({ items }: AttentionFeedProps) {
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "32px 20px",
        }}
      >
        <CheckCircle style={{ width: 18, height: 18, color: "#c8f135" }} />
        <span
          style={{
            fontSize: 14,
            color: "#666666",
            fontFamily: "var(--font-mono-alt)",
          }}
        >
          Your practice looks healthy. No issues detected.
        </span>
      </div>
    );
  }

  // Group by severity
  const groups: [string, AttentionItem[]][] = [];
  const grouped: Record<string, AttentionItem[]> = {};
  for (const item of items) {
    (grouped[item.severity] ??= []).push(item);
  }
  for (const sev of ["critical", "warning", "info"] as const) {
    if (grouped[sev]?.length) groups.push([sev, grouped[sev]]);
  }

  return (
    <div>
      {groups.map(([severity, groupItems], gi) => (
        <div key={severity}>
          {gi > 0 && (
            <div
              style={{
                height: 1,
                background: "#1e1e1e",
                margin: "4px 0",
              }}
            />
          )}
          {groupItems.map((item) => {
            const CatIcon = CATEGORY_ICONS[item.category] ?? AlertTriangle;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                }}
              >
                {/* Severity dot + category icon */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: SEVERITY_COLORS[item.severity],
                      display: "inline-block",
                    }}
                  />
                  <CatIcon
                    style={{
                      width: 14,
                      height: 14,
                      color: "#444444",
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#ffffff",
                      fontFamily: "var(--font-mono-alt)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#666666",
                      fontFamily: "var(--font-mono-alt)",
                      marginTop: 2,
                    }}
                  >
                    {item.description}
                  </div>
                </div>

                {/* CTA */}
                <Link
                  href={item.cta.href}
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#ffffff",
                    fontFamily: "var(--font-mono-alt)",
                    border: "1px solid #333333",
                    borderRadius: 5,
                    padding: "4px 10px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#c8f135")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#333333")
                  }
                >
                  {item.cta.label}
                </Link>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
