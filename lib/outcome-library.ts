// Pre-built outcome statement library for the service wizard.
// These are constants — never stored in the DB.

export type OutcomeCategory =
  | "security"
  | "backup-recovery"
  | "compliance"
  | "productivity"
  | "networking"
  | "advisory";

export interface PresetOutcome {
  id: string;
  category: OutcomeCategory;
  statement: string;
  description: string;
  complianceFrameworks?: string[];
}

export const OUTCOME_CATEGORY_LABELS: Record<OutcomeCategory, string> = {
  security: "Security",
  "backup-recovery": "Backup & Recovery",
  compliance: "Compliance",
  productivity: "Productivity",
  networking: "Networking",
  advisory: "Advisory",
};

export const OUTCOME_CATEGORIES: OutcomeCategory[] = [
  "security",
  "backup-recovery",
  "compliance",
  "productivity",
  "networking",
  "advisory",
];

export const OUTCOME_LIBRARY: PresetOutcome[] = [
  // ── Security (7) ───────────────────────────────────────────────────────────
  {
    id: "sec-01",
    category: "security",
    statement: "Reduce the risk of a ransomware attack reaching production systems",
    description: "Endpoint and network controls that stop ransomware before encryption occurs",
  },
  {
    id: "sec-02",
    category: "security",
    statement: "Detect and contain threats before they cause business disruption",
    description: "24/7 monitoring with defined response playbooks and containment procedures",
  },
  {
    id: "sec-03",
    category: "security",
    statement: "Prevent unauthorized access to sensitive business systems",
    description: "Identity controls, MFA enforcement, and access governance",
  },
  {
    id: "sec-04",
    category: "security",
    statement: "Maintain continuous visibility into security events across the environment",
    description: "Centralized log collection, correlation, and alerting",
  },
  {
    id: "sec-05",
    category: "security",
    statement: "Ensure security incidents are contained and resolved within defined timeframes",
    description: "Incident response procedures with SLA-backed resolution targets",
  },
  {
    id: "sec-06",
    category: "security",
    statement: "Protect employee identities and credentials from compromise",
    description: "Identity protection, dark web monitoring, and credential alerting",
  },
  {
    id: "sec-07",
    category: "security",
    statement: "Reduce attack surface exposed to external threats",
    description: "Vulnerability management and patching cadence",
  },

  // ── Backup & Recovery (4) ──────────────────────────────────────────────────
  {
    id: "bak-01",
    category: "backup-recovery",
    statement: "Recover business operations within defined timeframes after any disruption",
    description: "RTO/RPO-aligned backup and recovery with tested restore procedures",
  },
  {
    id: "bak-02",
    category: "backup-recovery",
    statement: "Ensure business-critical data is never permanently lost",
    description: "Immutable, offsite backup with point-in-time recovery",
  },
  {
    id: "bak-03",
    category: "backup-recovery",
    statement: "Protect against data loss from ransomware, hardware failure, or human error",
    description: "Multi-layer backup with air-gapped or immutable copies",
  },
  {
    id: "bak-04",
    category: "backup-recovery",
    statement: "Validate that backups are recoverable before they are needed",
    description: "Automated restore testing with monthly verification reporting",
  },

  // ── Compliance (5) ─────────────────────────────────────────────────────────
  {
    id: "cmp-01",
    category: "compliance",
    statement: "Maintain continuous compliance with regulatory requirements",
    description: "Ongoing compliance monitoring with gap tracking and remediation",
    complianceFrameworks: ["HIPAA", "PCI DSS", "CMMC"],
  },
  {
    id: "cmp-02",
    category: "compliance",
    statement: "Demonstrate security posture to auditors, partners, and clients",
    description: "Documentation, evidence collection, and audit-ready reporting",
    complianceFrameworks: ["HIPAA", "PCI DSS", "CMMC"],
  },
  {
    id: "cmp-03",
    category: "compliance",
    statement: "Protect patient health information from unauthorized access or disclosure",
    description: "HIPAA-aligned controls for ePHI access, transmission, and storage",
    complianceFrameworks: ["HIPAA"],
  },
  {
    id: "cmp-04",
    category: "compliance",
    statement: "Secure cardholder data and payment processing environments",
    description: "PCI DSS-aligned network segmentation, access controls, and monitoring",
    complianceFrameworks: ["PCI DSS"],
  },
  {
    id: "cmp-05",
    category: "compliance",
    statement: "Meet federal contract cybersecurity requirements for defense supply chain",
    description: "CMMC Level 1 or Level 2 practice implementation and documentation",
    complianceFrameworks: ["CMMC"],
  },

  // ── Productivity (3) ───────────────────────────────────────────────────────
  {
    id: "pro-01",
    category: "productivity",
    statement: "Maximize uptime and minimize disruption to daily business operations",
    description: "Proactive monitoring and fast incident resolution",
  },
  {
    id: "pro-02",
    category: "productivity",
    statement: "Enable employees to work securely from any location or device",
    description: "Secure remote access with identity verification and device management",
  },
  {
    id: "pro-03",
    category: "productivity",
    statement: "Ensure technology reliably supports business operations at all times",
    description: "Infrastructure monitoring, alerting, and preventive maintenance",
  },

  // ── Networking (2) ─────────────────────────────────────────────────────────
  {
    id: "net-01",
    category: "networking",
    statement: "Maintain secure, reliable network connectivity across all locations",
    description: "Network monitoring, redundancy, and performance management",
  },
  {
    id: "net-02",
    category: "networking",
    statement: "Prevent unauthorized network access and lateral movement",
    description: "Segmentation, firewall policy management, and access controls",
  },

  // ── Advisory (3) ───────────────────────────────────────────────────────────
  {
    id: "adv-01",
    category: "advisory",
    statement: "Align technology strategy with business goals and growth plans",
    description: "Quarterly advisory reviews with documented technology roadmap",
  },
  {
    id: "adv-02",
    category: "advisory",
    statement: "Identify technology risks before they impact business operations",
    description: "Proactive risk monitoring and executive-level reporting",
  },
  {
    id: "adv-03",
    category: "advisory",
    statement: "Enable confident technology investment decisions with clear guidance",
    description: "Advisory sessions, vendor evaluation support, and strategic recommendations",
  },
];

export function getOutcomesByCategory(category: OutcomeCategory): PresetOutcome[] {
  return OUTCOME_LIBRARY.filter((o) => o.category === category);
}

export function getOutcomesByFramework(framework: "HIPAA" | "PCI DSS" | "CMMC"): PresetOutcome[] {
  return OUTCOME_LIBRARY.filter((o) => o.complianceFrameworks?.includes(framework));
}
