"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ── Vertical definitions with simple geometric SVG icons ──────────────────

const VERTICALS = [
  { name: "Financial Services", icon: "dollar" },
  { name: "Healthcare", icon: "cross" },
  { name: "Legal & Professional Services", icon: "briefcase" },
  { name: "Manufacturing & Industrial", icon: "gear" },
  { name: "Retail & eCommerce", icon: "cart" },
  { name: "Government & Public Sector", icon: "building" },
  { name: "Technology & SaaS", icon: "code" },
  { name: "Energy & Utilities", icon: "bolt" },
  { name: "Education", icon: "book" },
  { name: "Insurance", icon: "shield" },
  { name: "Media & Entertainment", icon: "play" },
] as const;

const CLIENT_SIZES = [
  { label: "SMB", sub: "1–100 users" },
  { label: "Mid-Market", sub: "100–500 users" },
  { label: "Enterprise", sub: "500–1,000 users" },
  { label: "Large Enterprise", sub: "1,000+" },
];

const PERSONAS = [
  "CIO",
  "CISO",
  "IT Director",
  "CFO",
  "Owner/CEO",
  "Compliance Officer",
  "Operations Lead",
  "Board Level",
];

function VerticalIcon({ type }: { type: string }) {
  const style = { stroke: "#A8FF3E", strokeWidth: 1.5, fill: "none" };
  switch (type) {
    case "dollar":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <line x1="8" y1="2" x2="8" y2="14" />
          <path d="M5 5.5C5 4.1 6.3 3 8 3s3 1.1 3 2.5S9.7 8 8 8s-3 1.1-3 2.5S6.3 13 8 13s3-1.1 3-2.5" />
        </svg>
      );
    case "cross":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <rect x="6" y="2" width="4" height="12" rx="1" />
          <rect x="2" y="6" width="12" height="4" rx="1" />
        </svg>
      );
    case "briefcase":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <rect x="2" y="5" width="12" height="8" rx="1.5" />
          <path d="M5 5V3.5A1.5 1.5 0 016.5 2h3A1.5 1.5 0 0111 3.5V5" />
        </svg>
      );
    case "gear":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1 1M11.2 11.2l1 1M12.2 3.8l-1 1M4.8 11.2l-1 1" />
        </svg>
      );
    case "cart":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <path d="M2 2h2l1.5 7h6L14 4H5" />
          <circle cx="6" cy="12" r="1" />
          <circle cx="11" cy="12" r="1" />
        </svg>
      );
    case "building":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <rect x="3" y="2" width="10" height="12" rx="1" />
          <line x1="6" y1="5" x2="6" y2="5.01" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="5" x2="10" y2="5.01" strokeWidth="2" strokeLinecap="round" />
          <line x1="6" y1="8" x2="6" y2="8.01" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="8" x2="10" y2="8.01" strokeWidth="2" strokeLinecap="round" />
          <rect x="6.5" y="11" width="3" height="3" />
        </svg>
      );
    case "code":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <polyline points="5,4 2,8 5,12" />
          <polyline points="11,4 14,8 11,12" />
          <line x1="9" y1="3" x2="7" y2="13" />
        </svg>
      );
    case "bolt":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <polygon points="9,1 4,9 8,9 7,15 12,7 8,7" />
        </svg>
      );
    case "book":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <path d="M2 3v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1H3a1 1 0 00-1 1z" />
          <line x1="5" y1="2" x2="5" y2="14" />
        </svg>
      );
    case "shield":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <path d="M8 2L3 4.5V8c0 3.5 2.5 5.5 5 6.5 2.5-1 5-3 5-6.5V4.5L8 2z" />
        </svg>
      );
    case "play":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <circle cx="8" cy="8" r="6" />
          <polygon points="6.5,5 11.5,8 6.5,11" fill="#A8FF3E" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" {...style}>
          <circle cx="8" cy="8" r="5" />
        </svg>
      );
  }
}

interface StepClientsProps {
  verticals: string[];
  clientSizes: string[];
  buyerPersonas: string[];
  onVerticalsChange: (v: string[]) => void;
  onClientSizesChange: (v: string[]) => void;
  onBuyerPersonasChange: (v: string[]) => void;
}

function toggle(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

export function StepClients({
  verticals,
  clientSizes,
  buyerPersonas,
  onVerticalsChange,
  onClientSizesChange,
  onBuyerPersonasChange,
}: StepClientsProps) {
  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1 className="font-display text-white text-4xl font-bold uppercase tracking-tight">
          WHO DO YOU PROTECT?
        </h1>
        <p className="mt-2 font-mono text-muted-foreground text-sm">
          Tell us about the clients you serve.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Understanding your clients helps us suggest the right service structures and sales language for your proposals.
        </p>
      </div>

      {/* Verticals grid */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Verticals you service
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {VERTICALS.map((v) => {
            const selected = verticals.includes(v.name);
            return (
              <button
                key={v.name}
                type="button"
                onClick={() => onVerticalsChange(toggle(verticals, v.name))}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-3 py-3 text-left text-sm transition-[border-color,background-color] duration-100",
                  selected
                    ? "bg-primary/[0.06] border-primary text-primary"
                    : "bg-[#111111] border-border text-[#CCCCCC]"
                )}
              >
                <VerticalIcon type={v.icon} />
                <span className="font-display font-bold text-[13px]">
                  {v.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Client sizes */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Average client size
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {CLIENT_SIZES.map((cs) => {
            const selected = clientSizes.includes(cs.label);
            return (
              <button
                key={cs.label}
                type="button"
                onClick={() => onClientSizesChange(toggle(clientSizes, cs.label))}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-[border-color,background-color] duration-100",
                  selected
                    ? "bg-primary/[0.06] border-primary"
                    : "bg-[#111111] border-border"
                )}
              >
                <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-white")}>
                  {cs.label}
                </p>
                <p className="text-xs mt-0.5 text-muted-foreground">{cs.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Buyer personas */}
      <div className="space-y-3">
        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Primary buyer personas
        </Label>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => {
            const selected = buyerPersonas.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => onBuyerPersonasChange(toggle(buyerPersonas, p))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-[#111111] text-[#CCCCCC] border-border"
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
