import type { ToolCategory } from "@/lib/types";

export interface ComplianceMapping {
  toolCategory: string;
  hipaaWeight: number;
  pciWeight: number;
  cmmcWeight: number;
}

export const COMPLIANCE_TOOL_MAPPING: ComplianceMapping[] = [
  { toolCategory: "edr", hipaaWeight: 20, pciWeight: 20, cmmcWeight: 25 },
  { toolCategory: "mdr", hipaaWeight: 20, pciWeight: 20, cmmcWeight: 20 },
  { toolCategory: "siem", hipaaWeight: 20, pciWeight: 25, cmmcWeight: 15 },
  { toolCategory: "identity", hipaaWeight: 15, pciWeight: 10, cmmcWeight: 20 },
  { toolCategory: "mfa", hipaaWeight: 15, pciWeight: 10, cmmcWeight: 20 },
  { toolCategory: "backup", hipaaWeight: 15, pciWeight: 10, cmmcWeight: 10 },
  { toolCategory: "email_security", hipaaWeight: 5, pciWeight: 5, cmmcWeight: 5 },
  { toolCategory: "dark_web", hipaaWeight: 5, pciWeight: 5, cmmcWeight: 5 },
  { toolCategory: "network_monitoring", hipaaWeight: 5, pciWeight: 10, cmmcWeight: 10 },
  { toolCategory: "dns_filtering", hipaaWeight: 5, pciWeight: 10, cmmcWeight: 10 },
  { toolCategory: "vulnerability_management", hipaaWeight: 5, pciWeight: 10, cmmcWeight: 15 },
  { toolCategory: "security_awareness_training", hipaaWeight: 10, pciWeight: 10, cmmcWeight: 10 },
  { toolCategory: "documentation", hipaaWeight: 15, pciWeight: 15, cmmcWeight: 15 },
];

/**
 * Normalize a tool category string to the canonical lowercase form used in mappings.
 * Handles variations like "EDR", "Endpoint Detection", "edr" etc.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  endpoint: "edr",
  "endpoint detection": "edr",
  "endpoint protection": "edr",
  "detection & response": "siem",
  "email security": "email_security",
  "email-security": "email_security",
  network: "network_monitoring",
  "network security": "network_monitoring",
  compliance: "documentation",
  patch: "vulnerability_management",
  "patch management": "vulnerability_management",
  idp: "identity",
  "identity protection": "identity",
  "dark-web": "dark_web",
  "dark web": "dark_web",
  darkweb: "dark_web",
  "managed detection": "mdr",
};

export function normalizeToolCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] ?? lower;
}

export function calculateComplianceScores(toolCategories: string[]): {
  hipaa: number;
  pci: number;
  cmmc: number;
} {
  const score = { hipaa: 0, pci: 0, cmmc: 0 };
  // De-duplicate categories so stacking 3 EDR tools doesn't triple the weight
  const unique = [...new Set(toolCategories.map(normalizeToolCategory))];
  unique.forEach((cat) => {
    const mapping = COMPLIANCE_TOOL_MAPPING.find(
      (m) => m.toolCategory === cat
    );
    if (mapping) {
      score.hipaa = Math.min(score.hipaa + mapping.hipaaWeight, 100);
      score.pci = Math.min(score.pci + mapping.pciWeight, 100);
      score.cmmc = Math.min(score.cmmc + mapping.cmmcWeight, 100);
    }
  });
  return score;
}

/** Tool category to outcome ID mapping for suggested outcomes */
export const TOOL_CATEGORY_TO_OUTCOMES: Record<string, string[]> = {
  edr: ["sec-01", "sec-02", "sec-07"],
  mdr: ["sec-04", "sec-05", "sec-02"],
  siem: ["sec-04", "sec-05"],
  identity: ["sec-03", "sec-06"],
  mfa: ["sec-03", "sec-06"],
  backup: ["bak-01", "bak-02", "bak-03", "bak-04"],
  email_security: ["sec-01"],
  dark_web: ["sec-04"],
  documentation: ["cmp-01", "cmp-02"],
  network_monitoring: ["net-01", "net-02"],
  dns_filtering: ["net-01", "net-02"],
  vulnerability_management: ["sec-07"],
  security_awareness_training: ["sec-01"],
};

/** Baseline categories for a comprehensive security service */
export const BASELINE_CATEGORIES = [
  "edr",
  "backup",
  "identity",
  "email_security",
] as const;

export type BaselineCategory = (typeof BASELINE_CATEGORIES)[number];

export const BASELINE_CATEGORY_LABELS: Record<BaselineCategory, string> = {
  edr: "Endpoint Protection",
  backup: "Backup & Recovery",
  identity: "Identity Protection",
  email_security: "Email Security",
};
