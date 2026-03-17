// Service archetype templates for the wizard Step 2 template suggestion panel.
// NOT the same as lib/data/capability-templates.ts (which provides per-capability templates).

import type { OutcomeCategory } from "./outcome-library";

export interface ServiceTemplate {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: OutcomeCategory;
  relatedOutcomeIds: string[];
  components: string[];
  complianceFrameworks?: string[];
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    id: "tmpl-ztrust",
    name: "Comprehensive Zero-Trust Security",
    subtitle: "Combining endpoint protection, threat detection, identity governance, and security monitoring",
    description: "Full-stack security service built on zero-trust principles",
    category: "security",
    relatedOutcomeIds: ["sec-01", "sec-02", "sec-03", "sec-04"],
    components: [
      "Endpoint Detection & Response",
      "Managed Detection & Response",
      "Identity Protection",
      "SIEM & Log Management",
    ],
  },
  {
    id: "tmpl-endpoint",
    name: "Managed Endpoint Security",
    subtitle: "Combining endpoint protection, patch management, and threat response",
    description: "Endpoint-focused protection with managed response capability",
    category: "security",
    relatedOutcomeIds: ["sec-01", "sec-02", "sec-07"],
    components: [
      "Endpoint Detection & Response",
      "Patch Management",
      "Threat Response",
    ],
  },
  {
    id: "tmpl-soc",
    name: "Managed SOC Services",
    subtitle: "Combining 24/7 monitoring, threat detection, incident response, and security analytics",
    description: "Outsourced security operations center capability",
    category: "security",
    relatedOutcomeIds: ["sec-02", "sec-04", "sec-05"],
    components: [
      "24/7 Security Monitoring",
      "Threat Detection & Response",
      "Incident Management",
      "Security Analytics",
    ],
  },
  {
    id: "tmpl-identity",
    name: "Identity & Access Security",
    subtitle: "Combining identity protection, MFA enforcement, and access governance",
    description: "Identity-first security for modern workforce environments",
    category: "security",
    relatedOutcomeIds: ["sec-03", "sec-06"],
    components: [
      "Identity Protection",
      "Multi-Factor Authentication",
      "Privileged Access Management",
      "Access Governance",
    ],
  },
  {
    id: "tmpl-bcdr",
    name: "Business Continuity & Disaster Recovery",
    subtitle: "Combining immutable backup, offsite replication, and tested recovery procedures",
    description: "Comprehensive data protection and recovery capability",
    category: "backup-recovery",
    relatedOutcomeIds: ["bak-01", "bak-02", "bak-03", "bak-04"],
    components: [
      "Immutable Backup",
      "Offsite Replication",
      "Disaster Recovery Planning",
      "Recovery Testing",
    ],
  },
  {
    id: "tmpl-hipaa",
    name: "HIPAA Compliance Program",
    subtitle: "Combining ePHI protection, access controls, audit logging, and compliance reporting",
    description: "End-to-end HIPAA compliance for healthcare organizations",
    category: "compliance",
    relatedOutcomeIds: ["cmp-01", "cmp-02", "cmp-03"],
    components: [
      "ePHI Access Controls",
      "Audit Logging",
      "Encryption Management",
      "Compliance Reporting",
    ],
    complianceFrameworks: ["HIPAA"],
  },
  {
    id: "tmpl-pci",
    name: "PCI DSS Compliance Program",
    subtitle: "Combining network segmentation, cardholder data protection, and continuous monitoring",
    description: "PCI DSS compliance for payment processing environments",
    category: "compliance",
    relatedOutcomeIds: ["cmp-01", "cmp-02", "cmp-04"],
    components: [
      "Network Segmentation",
      "Cardholder Data Protection",
      "Vulnerability Scanning",
      "Compliance Monitoring",
    ],
    complianceFrameworks: ["PCI DSS"],
  },
  {
    id: "tmpl-cmmc",
    name: "CMMC Readiness Program",
    subtitle: "Combining access control, incident response, audit logging, and configuration management",
    description: "CMMC Level 1 and Level 2 practice implementation for defense contractors",
    category: "compliance",
    relatedOutcomeIds: ["cmp-01", "cmp-02", "cmp-05"],
    components: [
      "Access Control",
      "Incident Response",
      "Audit & Accountability",
      "Configuration Management",
      "System & Communications Protection",
    ],
    complianceFrameworks: ["CMMC"],
  },
  {
    id: "tmpl-advisory",
    name: "Fractional CTO Advisory",
    subtitle: "Combining technology strategy, risk monitoring, and executive reporting",
    description: "Strategic technology advisory delivered as a managed service",
    category: "advisory",
    relatedOutcomeIds: ["adv-01", "adv-02", "adv-03"],
    components: [
      "Technology Strategy Briefs",
      "Risk Monitoring",
      "Roadmap Planning",
      "Executive Advisory",
    ],
  },
];

/** Returns templates that match at least 2 of the selected outcome IDs, sorted by match count. */
export function getSuggestedTemplates(selectedOutcomeIds: string[]): ServiceTemplate[] {
  return SERVICE_TEMPLATES
    .filter(
      (t) =>
        t.relatedOutcomeIds.filter((id) => selectedOutcomeIds.includes(id)).length >= 2
    )
    .sort((a, b) => {
      const aMatches = a.relatedOutcomeIds.filter((id) => selectedOutcomeIds.includes(id)).length;
      const bMatches = b.relatedOutcomeIds.filter((id) => selectedOutcomeIds.includes(id)).length;
      return bMatches - aMatches;
    });
}
