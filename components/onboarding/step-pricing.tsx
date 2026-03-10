"use client";

import { useState } from "react";
import { PricingImportDropzone } from "@/components/imports/pricing-import-dropzone";

// ── Billing options mapped to BillingBasis enum ───────────────────────────────

const BILLING_OPTIONS = [
  { value: "per_user", label: "Per User / Month" },
  { value: "per_device", label: "Per Endpoint / Month" },
  { value: "flat_monthly", label: "Flat Monthly" },
  { value: "per_org", label: "Flat Annual" },
  { value: "per_domain", label: "Per User / Year" },
  { value: "per_location", label: "Per Endpoint / Year" },
] as const;

const ADD_CATEGORIES = [
  "Endpoint Protection",
  "SIEM & SOC",
  "Identity & Access",
  "Email Security",
  "Network Security",
  "Backup & Recovery",
  "Vulnerability Management",
  "Security Awareness",
  "GRC & Compliance",
  "RMM & PSA",
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ToolPricingEntry {
  billing_basis: string;
  cost_amount: number | null;
  sell_amount: number | null;
  min_commitment: number | null;
  min_units: number | null;
}

interface ToolRef {
  tool_name: string;
  vendor_name?: string | null;
  category: string;
}

interface StepPricingProps {
  tools: ToolRef[];
  toolPricing: Record<string, ToolPricingEntry>;
  onToolPricingChange: (pricing: Record<string, ToolPricingEntry>) => void;
  onAddTool: (tool: { tool_name: string; category: string }) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function marginPct(cost: number | null, sell: number | null): number | null {
  if (!cost || !sell || sell === 0) return null;
  return ((sell - cost) / sell) * 100;
}

function marginColor(m: number | null): string {
  if (m == null) return "#666666";
  if (m >= 30) return "#A8FF3E";
  if (m >= 15) return "#F59E0B";
  return "#EF4444";
}

const EMPTY_PRICING: ToolPricingEntry = {
  billing_basis: "",
  cost_amount: null,
  sell_amount: null,
  min_commitment: null,
  min_units: null,
};

// ── Component ─────────────────────────────────────────────────────────────────

export function StepPricing({
  tools,
  toolPricing,
  onToolPricingChange,
  onAddTool,
}: StepPricingProps) {
  const [path, setPath] = useState<"import" | "manual">("manual");
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState(ADD_CATEGORIES[0]);

  const updateField = (
    toolName: string,
    field: keyof ToolPricingEntry,
    value: string | number | null
  ) => {
    const current = toolPricing[toolName] ?? { ...EMPTY_PRICING };
    onToolPricingChange({
      ...toolPricing,
      [toolName]: { ...current, [field]: value },
    });
  };

  const handleAddTool = () => {
    const name = addName.trim();
    if (!name) return;
    onAddTool({ tool_name: name, category: addCategory });
    setAddName("");
  };

  // ── Blended margin ───────────────────────────────────────────────────────

  let totalCost = 0;
  let totalSell = 0;
  for (const t of tools) {
    const p = toolPricing[t.tool_name];
    if (p?.cost_amount && p?.sell_amount) {
      totalCost += p.cost_amount;
      totalSell += p.sell_amount;
    }
  }
  const blended = totalSell > 0 ? ((totalSell - totalCost) / totalSell) * 100 : null;

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1
          className="text-4xl font-bold uppercase tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "#FFFFFF", fontSize: 36 }}
        >
          WHAT DO YOU CHARGE?
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ fontFamily: "var(--font-mono-alt)", color: "#666666", fontSize: 14 }}
        >
          Enter your cost and sell price for each tool in your stack. This is how we model your
          margins.
        </p>
      </div>

      {/* Billing unit explainer */}
      <div
        className="rounded-lg border px-5 py-4"
        style={{
          backgroundColor: "rgba(168, 255, 62, 0.03)",
          borderColor: "rgba(168, 255, 62, 0.15)",
        }}
      >
        <p
          className="text-sm font-bold"
          style={{ color: "#A8FF3E" }}
        >
          Per-user and per-device are billing units, not pricing strategies.
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: "#999999" }}
        >
          We&apos;ll help you model the economics beneath them — cost floor, target margin, and the
          price that makes this service profitable.
        </p>
      </div>

      {/* Path toggle */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "import" as const, label: "Import Spreadsheet", icon: "📄" },
          { key: "manual" as const, label: "Enter Manually", icon: "✏️" },
        ]).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setPath(opt.key)}
            className="flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-sm font-semibold transition-[border-color,background-color] duration-100"
            style={{
              backgroundColor: path === opt.key ? "rgba(168, 255, 62, 0.06)" : "#111111",
              borderColor: path === opt.key ? "#A8FF3E" : "#1E1E1E",
              color: path === opt.key ? "#A8FF3E" : "#CCCCCC",
            }}
          >
            <span className="text-lg">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Path content */}
      {path === "import" ? (
        <div className="space-y-4">
          <PricingImportDropzone
            onExtracted={() => {
              // Switch to manual/review view after extraction
              setPath("manual");
            }}
          />
          <p
            className="text-xs text-center"
            style={{ color: "#666666", fontFamily: "var(--font-mono-alt)" }}
          >
            We&apos;ll extract your tool pricing automatically. You can review before continuing.
          </p>
        </div>
      ) : (
        <>
          {/* Pricing table */}
          {tools.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#666666" }}>
              No tools selected. Go back to Step 4 to add your tools.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div
                className="grid gap-2 px-3 py-2 text-[10px] font-medium uppercase tracking-widest"
                style={{
                  gridTemplateColumns: "1.5fr 1fr 1.2fr 0.8fr 0.8fr 0.6fr 0.7fr",
                  color: "#666666",
                  fontFamily: "var(--font-mono-alt)",
                }}
              >
                <span>Tool</span>
                <span>Category</span>
                <span>Billing</span>
                <span>Cost</span>
                <span>Sell</span>
                <span>Margin</span>
                <span>Min Units</span>
              </div>

              {/* Rows */}
              <div className="max-h-[50vh] overflow-y-auto space-y-1">
                {tools.map((t) => {
                  const p = toolPricing[t.tool_name] ?? EMPTY_PRICING;
                  const m = marginPct(p.cost_amount, p.sell_amount);

                  return (
                    <div
                      key={t.tool_name}
                      className="grid gap-2 items-center rounded-lg border px-3 py-2.5"
                      style={{
                        gridTemplateColumns: "1.5fr 1fr 1.2fr 0.8fr 0.8fr 0.6fr 0.7fr",
                        backgroundColor: "#111111",
                        borderColor: "#1E1E1E",
                      }}
                    >
                      {/* Tool name */}
                      <span
                        className="text-sm font-semibold truncate"
                        style={{ color: "#FFFFFF" }}
                        title={t.tool_name}
                      >
                        {t.tool_name}
                      </span>

                      {/* Category badge */}
                      <span
                        className="text-[10px] truncate rounded px-1.5 py-0.5 text-center"
                        style={{ backgroundColor: "#1E1E1E", color: "#999999" }}
                        title={t.category}
                      >
                        {t.category}
                      </span>

                      {/* Billing */}
                      <select
                        value={p.billing_basis}
                        onChange={(e) =>
                          updateField(t.tool_name, "billing_basis", e.target.value)
                        }
                        className="rounded border px-1.5 py-1.5 text-xs outline-none"
                        style={{
                          backgroundColor: "#0A0A0A",
                          borderColor: "#1E1E1E",
                          color: "#CCCCCC",
                        }}
                      >
                        <option value="">Select…</option>
                        {BILLING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>

                      {/* Cost */}
                      <div className="relative">
                        <span
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
                          style={{ color: "#666666" }}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={p.cost_amount ?? ""}
                          onChange={(e) =>
                            updateField(
                              t.tool_name,
                              "cost_amount",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded border py-1.5 pl-5 pr-1.5 text-xs outline-none"
                          style={{
                            backgroundColor: "#0A0A0A",
                            borderColor: "#1E1E1E",
                            color: "#FFFFFF",
                          }}
                        />
                      </div>

                      {/* Sell */}
                      <div className="relative">
                        <span
                          className="absolute left-2 top-1/2 -translate-y-1/2 text-xs"
                          style={{ color: "#666666" }}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={p.sell_amount ?? ""}
                          onChange={(e) =>
                            updateField(
                              t.tool_name,
                              "sell_amount",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="0.00"
                          className="w-full rounded border py-1.5 pl-5 pr-1.5 text-xs outline-none"
                          style={{
                            backgroundColor: "#0A0A0A",
                            borderColor: "#1E1E1E",
                            color: "#FFFFFF",
                          }}
                        />
                      </div>

                      {/* Margin */}
                      <span
                        className="text-xs font-semibold text-center"
                        style={{ color: marginColor(m) }}
                      >
                        {m != null ? `${m.toFixed(1)}%` : "—"}
                      </span>

                      {/* Min units */}
                      <input
                        type="number"
                        min={0}
                        value={p.min_units ?? ""}
                        onChange={(e) =>
                          updateField(
                            t.tool_name,
                            "min_units",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="—"
                        className="w-full rounded border px-1.5 py-1.5 text-xs outline-none"
                        style={{
                          backgroundColor: "#0A0A0A",
                          borderColor: "#1E1E1E",
                          color: "#FFFFFF",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Blended margin summary */}
              <div
                className="flex items-center justify-between rounded-lg border px-4 py-3 mt-3"
                style={{ backgroundColor: "#111111", borderColor: "#1E1E1E" }}
              >
                <span className="text-sm font-medium" style={{ color: "#999999" }}>
                  Blended margin across all tools:
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ color: blended != null ? marginColor(blended) : "#666666" }}
                >
                  {blended != null ? `${blended.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
          )}

          {/* Add another tool */}
          <div className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "#999999" }}
            >
              Add Another Tool
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTool();
                  }
                }}
                placeholder="Tool name"
                className="flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none placeholder:text-[#444]"
                style={{
                  backgroundColor: "#111111",
                  borderColor: "#1E1E1E",
                  color: "#FFFFFF",
                }}
              />
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                className="rounded-lg border px-2 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: "#111111",
                  borderColor: "#1E1E1E",
                  color: "#CCCCCC",
                  minWidth: 140,
                }}
              >
                {ADD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddTool}
                disabled={!addName.trim()}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-30"
                style={{
                  borderColor: "#1E1E1E",
                  color: "#A8FF3E",
                  backgroundColor: "#111111",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
