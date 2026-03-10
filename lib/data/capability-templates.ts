// Hardcoded capability templates for the service wizard Step 2.
// Keyed by outcome_type from Step 1.

export const OUTCOME_CATEGORY_LABELS: Record<string, string> = {
  security: "Risk Reduction",
  compliance: "Compliance",
  growth: "Revenue Protection",
  efficiency: "Productivity",
};

export interface CapabilityTemplate {
  name: string;
  description: string;
}

export const CAPABILITY_TEMPLATES: Record<string, CapabilityTemplate[]> = {
  security: [
    {
      name: "Endpoint Detection & Response",
      description:
        "Deploy and manage EDR agents across all endpoints with 24/7 alert triage and threat containment.",
    },
    {
      name: "Vulnerability Management",
      description:
        "Continuous scanning, prioritization, and remediation tracking of infrastructure and application vulnerabilities.",
    },
    {
      name: "Security Awareness Training",
      description:
        "Recurring phishing simulations and training modules to reduce human-factor risk across the organization.",
    },
    {
      name: "SIEM & Log Monitoring",
      description:
        "Centralized log collection, correlation, and real-time alerting for security events and anomalies.",
    },
    {
      name: "Identity & Access Management",
      description:
        "MFA enforcement, SSO integration, and privileged access controls to secure user identities.",
    },
    {
      name: "Incident Response Retainer",
      description:
        "Pre-negotiated response hours and runbooks for rapid containment and recovery during security incidents.",
    },
  ],
  compliance: [
    {
      name: "Policy Framework Development",
      description:
        "Create and maintain security policies, standards, and procedures aligned to target compliance frameworks.",
    },
    {
      name: "Continuous Compliance Monitoring",
      description:
        "Automated control testing and evidence collection mapped to regulatory requirements.",
    },
    {
      name: "Audit Preparation & Support",
      description:
        "Gap assessments, evidence packaging, and auditor liaison to streamline certification and renewal audits.",
    },
    {
      name: "Risk Assessment & Reporting",
      description:
        "Periodic risk assessments with scored findings and executive-level reporting for board and regulator visibility.",
    },
    {
      name: "Data Protection & Privacy",
      description:
        "Data classification, DLP controls, and privacy impact assessments to meet data protection regulations.",
    },
    {
      name: "Third-Party Risk Management",
      description:
        "Vendor security assessments, questionnaire management, and ongoing monitoring of supply-chain risk.",
    },
  ],
  growth: [
    {
      name: "Business Continuity Planning",
      description:
        "Develop and test BC/DR plans to minimize downtime and protect revenue during disruptions.",
    },
    {
      name: "Cyber Insurance Readiness",
      description:
        "Align security controls to insurer requirements to secure or renew favorable cyber insurance terms.",
    },
    {
      name: "Customer Trust & Assurance",
      description:
        "Security questionnaire responses, trust center maintenance, and due-diligence support for sales enablement.",
    },
    {
      name: "Brand & Reputation Protection",
      description:
        "Dark web monitoring, domain protection, and takedown services to safeguard brand integrity.",
    },
    {
      name: "Secure Digital Transformation",
      description:
        "Security architecture reviews and guardrails for cloud migration, new products, and M&A integrations.",
    },
    {
      name: "Revenue-Critical App Protection",
      description:
        "WAF management, DDoS mitigation, and application security testing for customer-facing platforms.",
    },
  ],
  efficiency: [
    {
      name: "Security Tool Rationalization",
      description:
        "Audit existing tooling, eliminate overlap, and consolidate licenses to reduce cost and complexity.",
    },
    {
      name: "Automated Alert Triage",
      description:
        "SOAR playbooks and automation to reduce mean-time-to-respond and free analyst capacity.",
    },
    {
      name: "Patch Management",
      description:
        "Automated patch testing and deployment workflows to maintain compliance SLAs with minimal disruption.",
    },
    {
      name: "Cloud Security Posture Management",
      description:
        "Continuous misconfiguration detection and auto-remediation across cloud environments.",
    },
    {
      name: "IT & Security Operations Reporting",
      description:
        "Unified dashboards and scheduled reports that give leadership visibility without manual data gathering.",
    },
    {
      name: "Help Desk & Ticket Automation",
      description:
        "Streamline security-related ticket routing, SLA tracking, and self-service resolution for common requests.",
    },
  ],
};

interface TemplateGroup {
  category: string;
  capabilities: CapabilityTemplate[];
}

/**
 * Returns template groups for a given outcome type.
 * - Specific types (security, compliance, growth, efficiency) → single group
 * - "custom" → all 4 groups with section headers
 */
export function getTemplatesForOutcome(outcomeType: string): TemplateGroup[] {
  if (outcomeType === "custom") {
    return Object.entries(CAPABILITY_TEMPLATES).map(([key, capabilities]) => ({
      category: OUTCOME_CATEGORY_LABELS[key] ?? key,
      capabilities,
    }));
  }

  const capabilities = CAPABILITY_TEMPLATES[outcomeType];
  if (!capabilities) return [];

  return [
    {
      category: OUTCOME_CATEGORY_LABELS[outcomeType] ?? outcomeType,
      capabilities,
    },
  ];
}
