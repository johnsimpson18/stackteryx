// Curated reference library of security tools for MSPs.
// Single source of truth — imported by Stack Catalog, Wizard Step 3, and Vendor modals.

export type LibraryDomain =
  | "Identity"
  | "Endpoint"
  | "Network"
  | "Cloud"
  | "Data"
  | "SOC/SIEM"
  | "Backup"
  | "Compliance"
  | "Productivity";

export type BillingUnit = "per-user" | "per-device" | "flat";

export interface LibraryTool {
  id: string; // stable slug for dedup
  name: string;
  vendor: string;
  domain: LibraryDomain;
  description: string;
  typical_cost_per_user: number;
  billing_unit: BillingUnit;
}

export const TOOL_LIBRARY: LibraryTool[] = [
  // ── Identity ────────────────────────────────────────────────────
  { id: "okta", name: "Okta", vendor: "Okta", domain: "Identity", description: "Cloud-based identity and access management with SSO, MFA, and lifecycle management.", typical_cost_per_user: 6, billing_unit: "per-user" },
  { id: "entra-id", name: "Microsoft Entra ID", vendor: "Microsoft", domain: "Identity", description: "Microsoft's cloud identity platform with SSO, conditional access, and privileged identity management.", typical_cost_per_user: 6, billing_unit: "per-user" },
  { id: "duo-security", name: "Duo Security", vendor: "Cisco", domain: "Identity", description: "Multi-factor authentication and zero trust access security for any application.", typical_cost_per_user: 3, billing_unit: "per-user" },
  { id: "cyberark", name: "CyberArk", vendor: "CyberArk", domain: "Identity", description: "Privileged access management protecting high-risk accounts and credentials.", typical_cost_per_user: 8, billing_unit: "per-user" },
  { id: "jumpcloud", name: "JumpCloud", vendor: "JumpCloud", domain: "Identity", description: "Directory-as-a-service providing identity, device, and access management from a single platform.", typical_cost_per_user: 11, billing_unit: "per-user" },

  // ── Endpoint ────────────────────────────────────────────────────
  { id: "crowdstrike-falcon", name: "CrowdStrike Falcon", vendor: "CrowdStrike", domain: "Endpoint", description: "AI-native endpoint protection platform with EDR, threat intelligence, and managed detection.", typical_cost_per_user: 15, billing_unit: "per-device" },
  { id: "sentinelone", name: "SentinelOne", vendor: "SentinelOne", domain: "Endpoint", description: "Autonomous endpoint security with AI-powered prevention, detection, and response.", typical_cost_per_user: 12, billing_unit: "per-device" },
  { id: "ms-defender", name: "Microsoft Defender", vendor: "Microsoft", domain: "Endpoint", description: "Integrated endpoint protection built into Windows with EDR and threat analytics.", typical_cost_per_user: 5, billing_unit: "per-device" },
  { id: "sophos-intercept-x", name: "Sophos Intercept X", vendor: "Sophos", domain: "Endpoint", description: "Next-gen endpoint protection with deep learning and anti-ransomware technology.", typical_cost_per_user: 10, billing_unit: "per-device" },
  { id: "huntress", name: "Huntress", vendor: "Huntress", domain: "Endpoint", description: "Managed EDR for SMBs with 24/7 SOC support and ransomware canaries.", typical_cost_per_user: 5, billing_unit: "per-device" },
  { id: "malwarebytes", name: "Malwarebytes", vendor: "Malwarebytes", domain: "Endpoint", description: "Business endpoint protection and remediation against malware, ransomware, and exploits.", typical_cost_per_user: 4, billing_unit: "per-device" },

  // ── Network ─────────────────────────────────────────────────────
  { id: "cisco-meraki", name: "Cisco Meraki", vendor: "Cisco", domain: "Network", description: "Cloud-managed networking with integrated security, SD-WAN, and centralized visibility.", typical_cost_per_user: 10, billing_unit: "per-device" },
  { id: "palo-alto", name: "Palo Alto Networks", vendor: "Palo Alto Networks", domain: "Network", description: "Next-generation firewall with app-level visibility, threat prevention, and URL filtering.", typical_cost_per_user: 15, billing_unit: "per-device" },
  { id: "fortinet-fortigate", name: "Fortinet FortiGate", vendor: "Fortinet", domain: "Network", description: "Unified threat management firewall with SD-WAN, intrusion prevention, and web filtering.", typical_cost_per_user: 8, billing_unit: "per-device" },
  { id: "sonicwall", name: "SonicWall", vendor: "SonicWall", domain: "Network", description: "Network security appliances with deep packet inspection and advanced threat protection.", typical_cost_per_user: 7, billing_unit: "per-device" },
  { id: "zscaler", name: "Zscaler", vendor: "Zscaler", domain: "Network", description: "Cloud-native zero trust network access replacing traditional VPN and perimeter security.", typical_cost_per_user: 9, billing_unit: "per-user" },
  { id: "cisco-umbrella", name: "Cisco Umbrella", vendor: "Cisco", domain: "Network", description: "DNS-layer security blocking threats before they reach the network or endpoints.", typical_cost_per_user: 3, billing_unit: "per-user" },

  // ── Cloud ───────────────────────────────────────────────────────
  { id: "ms-defender-cloud", name: "Microsoft Defender for Cloud", vendor: "Microsoft", domain: "Cloud", description: "Cloud security posture management and workload protection across Azure, AWS, and GCP.", typical_cost_per_user: 15, billing_unit: "flat" },
  { id: "wiz", name: "Wiz", vendor: "Wiz", domain: "Cloud", description: "Agentless cloud security platform providing full visibility into cloud risk and misconfigurations.", typical_cost_per_user: 20, billing_unit: "flat" },
  { id: "orca-security", name: "Orca Security", vendor: "Orca", domain: "Cloud", description: "Cloud-native application protection platform with agentless workload and data security.", typical_cost_per_user: 18, billing_unit: "flat" },
  { id: "lacework", name: "Lacework", vendor: "Lacework", domain: "Cloud", description: "Data-driven cloud security for workloads, containers, and cloud accounts.", typical_cost_per_user: 16, billing_unit: "flat" },
  { id: "prisma-cloud", name: "Prisma Cloud", vendor: "Palo Alto Networks", domain: "Cloud", description: "Comprehensive cloud native security platform covering the full application lifecycle.", typical_cost_per_user: 18, billing_unit: "flat" },

  // ── Data ────────────────────────────────────────────────────────
  { id: "varonis", name: "Varonis", vendor: "Varonis", domain: "Data", description: "Data security platform that protects enterprise data from insider threats and cyberattacks.", typical_cost_per_user: 12, billing_unit: "per-user" },
  { id: "forcepoint-dlp", name: "Forcepoint DLP", vendor: "Forcepoint", domain: "Data", description: "Data loss prevention protecting sensitive data across endpoints, networks, and cloud.", typical_cost_per_user: 10, billing_unit: "per-user" },
  { id: "ms-purview", name: "Microsoft Purview", vendor: "Microsoft", domain: "Data", description: "Unified data governance and compliance solution for data discovery, classification, and protection.", typical_cost_per_user: 8, billing_unit: "per-user" },
  { id: "digital-guardian", name: "Digital Guardian", vendor: "Fortra", domain: "Data", description: "Data loss prevention and insider threat protection for IP-sensitive organizations.", typical_cost_per_user: 11, billing_unit: "per-user" },

  // ── SOC/SIEM ────────────────────────────────────────────────────
  { id: "splunk", name: "Splunk", vendor: "Splunk", domain: "SOC/SIEM", description: "Industry-leading SIEM platform for security monitoring, threat detection, and incident response.", typical_cost_per_user: 50, billing_unit: "flat" },
  { id: "ms-sentinel", name: "Microsoft Sentinel", vendor: "Microsoft", domain: "SOC/SIEM", description: "Cloud-native SIEM and SOAR with AI-driven threat intelligence and automated response.", typical_cost_per_user: 25, billing_unit: "flat" },
  { id: "solarwinds-siem", name: "SolarWinds SIEM", vendor: "SolarWinds", domain: "SOC/SIEM", description: "Security event management with log management, compliance reporting, and threat detection.", typical_cost_per_user: 20, billing_unit: "flat" },
  { id: "logrhythm", name: "LogRhythm", vendor: "LogRhythm", domain: "SOC/SIEM", description: "Security intelligence platform combining SIEM, UEBA, and SOAR capabilities.", typical_cost_per_user: 30, billing_unit: "flat" },
  { id: "datto-edr", name: "Datto EDR", vendor: "Datto", domain: "SOC/SIEM", description: "Managed SOC and EDR solution built for MSPs with 24/7 threat monitoring.", typical_cost_per_user: 8, billing_unit: "per-device" },

  // ── Backup ──────────────────────────────────────────────────────
  { id: "veeam", name: "Veeam", vendor: "Veeam", domain: "Backup", description: "Backup, recovery, and data management for cloud, virtual, and physical environments.", typical_cost_per_user: 10, billing_unit: "per-device" },
  { id: "acronis", name: "Acronis", vendor: "Acronis", domain: "Backup", description: "Integrated cyber protection combining backup, disaster recovery, and security in one platform.", typical_cost_per_user: 8, billing_unit: "per-device" },
  { id: "datto-bcdr", name: "Datto BCDR", vendor: "Datto", domain: "Backup", description: "Business continuity and disaster recovery purpose-built for MSPs with instant virtualization.", typical_cost_per_user: 15, billing_unit: "per-device" },
  { id: "axcient", name: "Axcient", vendor: "Axcient", domain: "Backup", description: "Business continuity platform for MSPs with local and cloud backup and bare metal recovery.", typical_cost_per_user: 12, billing_unit: "per-device" },
  { id: "druva", name: "Druva", vendor: "Druva", domain: "Backup", description: "SaaS data protection and governance for endpoints, cloud workloads, and SaaS applications.", typical_cost_per_user: 10, billing_unit: "per-user" },

  // ── Compliance ──────────────────────────────────────────────────
  { id: "knowbe4", name: "KnowBe4", vendor: "KnowBe4", domain: "Compliance", description: "Security awareness training and simulated phishing platform for compliance and risk reduction.", typical_cost_per_user: 5, billing_unit: "per-user" },
  { id: "qualys", name: "Qualys", vendor: "Qualys", domain: "Compliance", description: "Cloud-based IT security and compliance platform with vulnerability management and policy compliance.", typical_cost_per_user: 15, billing_unit: "per-device" },
  { id: "rapid7-insightvm", name: "Rapid7 InsightVM", vendor: "Rapid7", domain: "Compliance", description: "Vulnerability risk management with live dashboards, real risk prioritization, and remediation workflow.", typical_cost_per_user: 12, billing_unit: "per-device" },
  { id: "tenable", name: "Tenable", vendor: "Tenable", domain: "Compliance", description: "Cyber exposure platform for vulnerability management, compliance, and attack surface visibility.", typical_cost_per_user: 12, billing_unit: "per-device" },
  { id: "compliancy-group", name: "Compliancy Group", vendor: "Compliancy Group", domain: "Compliance", description: "HIPAA compliance management software with guided implementation and audit support.", typical_cost_per_user: 8, billing_unit: "per-user" },

  // ── Productivity ────────────────────────────────────────────────
  { id: "ms-365", name: "Microsoft 365", vendor: "Microsoft", domain: "Productivity", description: "Cloud productivity suite with email, collaboration, and integrated security controls.", typical_cost_per_user: 22, billing_unit: "per-user" },
  { id: "google-workspace", name: "Google Workspace", vendor: "Google", domain: "Productivity", description: "Cloud-based productivity and collaboration tools with enterprise security and admin controls.", typical_cost_per_user: 12, billing_unit: "per-user" },
  { id: "proofpoint", name: "Proofpoint", vendor: "Proofpoint", domain: "Productivity", description: "Email security and compliance protecting against phishing, malware, and data loss via email.", typical_cost_per_user: 8, billing_unit: "per-user" },
  { id: "mimecast", name: "Mimecast", vendor: "Mimecast", domain: "Productivity", description: "Email security, archiving, and continuity protecting Microsoft 365 and Google Workspace.", typical_cost_per_user: 7, billing_unit: "per-user" },
  { id: "barracuda", name: "Barracuda", vendor: "Barracuda", domain: "Productivity", description: "Email protection, backup, and network security products designed for MSPs.", typical_cost_per_user: 6, billing_unit: "per-user" },
];

// ── Derived data ──────────────────────────────────────────────────────────────

export const LIBRARY_DOMAINS: LibraryDomain[] = [
  "Identity",
  "Endpoint",
  "Network",
  "Cloud",
  "Data",
  "SOC/SIEM",
  "Backup",
  "Compliance",
  "Productivity",
];

export interface LibraryVendor {
  name: string;
  toolCount: number;
}

export const VENDOR_LIST: LibraryVendor[] = (() => {
  const counts = new Map<string, number>();
  for (const tool of TOOL_LIBRARY) {
    counts.set(tool.vendor, (counts.get(tool.vendor) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, toolCount]) => ({ name, toolCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getToolsByDomain(domain: LibraryDomain): LibraryTool[] {
  return TOOL_LIBRARY.filter((t) => t.domain === domain);
}

export function getToolsByVendor(vendor: string): LibraryTool[] {
  return TOOL_LIBRARY.filter((t) => t.vendor === vendor);
}

// ── Mapping from library domain to existing ToolCategory enum ─────────────

import type { ToolCategory, PricingModel } from "@/lib/types";

export const DOMAIN_TO_CATEGORY: Record<LibraryDomain, ToolCategory> = {
  Identity: "identity",
  Endpoint: "edr",
  Network: "network_monitoring",
  Cloud: "other",
  Data: "other",
  "SOC/SIEM": "siem",
  Backup: "backup",
  Compliance: "vulnerability_management",
  Productivity: "email_security",
};

export const BILLING_UNIT_TO_PRICING_MODEL: Record<BillingUnit, PricingModel> = {
  "per-user": "per_user",
  "per-device": "per_seat",
  flat: "flat_monthly",
};
