"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ── Tool catalog by category ──────────────────────────────────────────────────

const TOOL_CATEGORIES = [
  {
    label: "Endpoint Protection",
    tools: [
      { name: "CrowdStrike Falcon", vendor: "CrowdStrike" },
      { name: "SentinelOne Singularity", vendor: "SentinelOne" },
      { name: "Microsoft Defender for Endpoint", vendor: "Microsoft" },
      { name: "Sophos Intercept X", vendor: "Sophos" },
      { name: "Bitdefender GravityZone", vendor: "Bitdefender" },
      { name: "Huntress", vendor: "Huntress" },
      { name: "Malwarebytes", vendor: "Malwarebytes" },
    ],
  },
  {
    label: "SIEM & SOC",
    tools: [
      { name: "Microsoft Sentinel", vendor: "Microsoft" },
      { name: "Splunk", vendor: "Splunk" },
      { name: "Elastic Security", vendor: "Elastic" },
      { name: "Sumo Logic", vendor: "Sumo Logic" },
      { name: "LogRhythm", vendor: "LogRhythm" },
      { name: "Blumira", vendor: "Blumira" },
      { name: "Rapid7 InsightIDR", vendor: "Rapid7" },
    ],
  },
  {
    label: "Identity & Access",
    tools: [
      { name: "Microsoft Entra ID", vendor: "Microsoft" },
      { name: "Okta", vendor: "Okta" },
      { name: "Duo Security", vendor: "Cisco" },
      { name: "JumpCloud", vendor: "JumpCloud" },
      { name: "CyberArk", vendor: "CyberArk" },
      { name: "BeyondTrust", vendor: "BeyondTrust" },
      { name: "1Password Business", vendor: "1Password" },
    ],
  },
  {
    label: "Email Security",
    tools: [
      { name: "Proofpoint", vendor: "Proofpoint" },
      { name: "Mimecast", vendor: "Mimecast" },
      { name: "Abnormal Security", vendor: "Abnormal" },
      { name: "Barracuda Email Protection", vendor: "Barracuda" },
      { name: "Microsoft Defender for Office 365", vendor: "Microsoft" },
      { name: "Avanan", vendor: "Check Point" },
    ],
  },
  {
    label: "Network Security",
    tools: [
      { name: "Fortinet FortiGate", vendor: "Fortinet" },
      { name: "Palo Alto Networks NGFW", vendor: "Palo Alto" },
      { name: "Cisco Meraki MX", vendor: "Cisco" },
      { name: "WatchGuard", vendor: "WatchGuard" },
      { name: "SonicWall", vendor: "SonicWall" },
      { name: "Perimeter 81", vendor: "Check Point" },
      { name: "Zscaler", vendor: "Zscaler" },
    ],
  },
  {
    label: "Backup & Recovery",
    tools: [
      { name: "Veeam", vendor: "Veeam" },
      { name: "Datto / Kaseya", vendor: "Kaseya" },
      { name: "Acronis Cyber Protect", vendor: "Acronis" },
      { name: "Axcient", vendor: "Axcient" },
      { name: "Druva", vendor: "Druva" },
      { name: "Commvault", vendor: "Commvault" },
    ],
  },
  {
    label: "Vulnerability Management",
    tools: [
      { name: "Tenable Nessus", vendor: "Tenable" },
      { name: "Qualys VMDR", vendor: "Qualys" },
      { name: "Rapid7 InsightVM", vendor: "Rapid7" },
      { name: "Automox", vendor: "Automox" },
      { name: "NinjaOne", vendor: "NinjaOne" },
      { name: "ConnectWise Automate", vendor: "ConnectWise" },
    ],
  },
  {
    label: "Security Awareness",
    tools: [
      { name: "KnowBe4", vendor: "KnowBe4" },
      { name: "Proofpoint SAT", vendor: "Proofpoint" },
      { name: "Arctic Wolf SAT", vendor: "Arctic Wolf" },
      { name: "Curricula", vendor: "Huntress" },
      { name: "Ninjio", vendor: "Ninjio" },
    ],
  },
  {
    label: "GRC & Compliance",
    tools: [
      { name: "Drata", vendor: "Drata" },
      { name: "Vanta", vendor: "Vanta" },
      { name: "ScoreForge", vendor: "ScoreForge" },
      { name: "ControlMap", vendor: "ControlMap" },
      { name: "Compliance Manager GRC", vendor: "Compliance Manager" },
    ],
  },
  {
    label: "RMM & PSA",
    tools: [
      { name: "ConnectWise Manage", vendor: "ConnectWise" },
      { name: "Datto Autotask", vendor: "Kaseya" },
      { name: "HaloPSA", vendor: "HaloPSA" },
      { name: "NinjaOne RMM", vendor: "NinjaOne" },
      { name: "ConnectWise RMM", vendor: "ConnectWise" },
      { name: "N-able N-central", vendor: "N-able" },
    ],
  },
];

interface ToolEntry {
  tool_name: string;
  vendor_name?: string | null;
  category: string;
  is_custom?: boolean;
}

interface CustomTool {
  tool_name: string;
  category: string;
}

interface StepToolsProps {
  tools: ToolEntry[];
  customTools: CustomTool[];
  onToolsChange: (v: ToolEntry[]) => void;
  onCustomToolsChange: (v: CustomTool[]) => void;
}

export function StepTools({
  tools,
  customTools,
  onToolsChange,
  onCustomToolsChange,
}: StepToolsProps) {
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState(TOOL_CATEGORIES[0].label);

  const selectedNames = new Set(tools.map((t) => t.tool_name));

  const toggleTool = (name: string, vendor: string, category: string) => {
    if (selectedNames.has(name)) {
      onToolsChange(tools.filter((t) => t.tool_name !== name));
    } else {
      onToolsChange([...tools, { tool_name: name, vendor_name: vendor, category }]);
    }
  };

  const addCustom = () => {
    const value = customName.trim();
    if (value && !customTools.some((t) => t.tool_name === value)) {
      onCustomToolsChange([...customTools, { tool_name: value, category: customCategory }]);
    }
    setCustomName("");
  };

  const removeCustom = (name: string) => {
    onCustomToolsChange(customTools.filter((t) => t.tool_name !== name));
  };

  return (
    <div className="space-y-8">
      {/* Headline */}
      <div>
        <h1
          className="font-display text-white text-4xl font-bold uppercase tracking-tight"
        >
          BUILD YOUR STACK
        </h1>
        <p
          className="mt-2 font-mono text-muted-foreground text-sm"
        >
          Select the security tools your team uses to deliver services. Organize them by the domains they cover.
        </p>
      </div>

      {/* Categorized tool grid */}
      {TOOL_CATEGORIES.map((cat) => (
        <div key={cat.label} className="space-y-2.5">
          <label
            className="font-mono text-primary text-[10px] font-medium uppercase tracking-widest"
          >
            {cat.label}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {cat.tools.map((tool) => {
              const selected = selectedNames.has(tool.name);
              return (
                <button
                  key={tool.name}
                  type="button"
                  onClick={() => toggleTool(tool.name, tool.vendor, cat.label)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-[border-color,background-color] duration-100",
                    selected
                      ? "bg-primary/[0.06] border-primary text-primary"
                      : "bg-[#111111] border-border text-[#CCCCCC]"
                  )}
                >
                  {selected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-primary" />}
                  <span className="font-display font-bold text-[13px]">
                    {tool.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom tools */}
      <div className="space-y-3">
        <Label
          className="text-muted-foreground text-xs font-medium uppercase tracking-wider"
        >
          Don&apos;t see a tool? Add it here.
        </Label>

        {/* Custom tags */}
        {customTools.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customTools.map((t) => (
              <span
                key={t.tool_name}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground"
              >
                {t.tool_name}
                <span className="opacity-60">({t.category})</span>
                <button
                  type="button"
                  onClick={() => removeCustom(t.tool_name)}
                  className="ml-0.5 hover:opacity-70"
                  aria-label={`Remove ${t.tool_name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Tool name"
            className="flex-1 bg-[#111111] border-border text-white rounded-lg px-4 py-3 text-sm placeholder:text-[#444]"
          />
          <select
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="min-w-[160px] rounded-lg border border-border bg-[#111111] text-[#CCCCCC] px-3 py-3 text-sm outline-none"
          >
            {TOOL_CATEGORIES.map((cat) => (
              <option key={cat.label} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addCustom}
            disabled={!customName.trim()}
            className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-primary bg-[#111111] transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
