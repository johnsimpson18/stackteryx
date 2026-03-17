// Tool-to-outcome translation layer.
// Converts raw tool/vendor data into client-facing capability descriptions.

import type { ToolCategory } from "@/lib/types";

export interface ToolTranslation {
  toolName: string;
  category: string;
  clientDescription: string;
  outcomeContribution: string;
}

export const TOOL_CATEGORY_TRANSLATIONS: Record<
  string,
  { clientLabel: string; outcomeLanguage: string }
> = {
  edr: {
    clientLabel: "Endpoint Threat Protection",
    outcomeLanguage:
      "continuously monitors and protects every device from malware, ransomware, and advanced threats",
  },
  mdr: {
    clientLabel: "Managed Threat Detection & Response",
    outcomeLanguage:
      "provides 24/7 expert monitoring with active threat hunting and rapid incident response",
  },
  siem: {
    clientLabel: "Security Event Monitoring",
    outcomeLanguage:
      "collects and analyzes security events across your environment to detect suspicious activity",
  },
  backup: {
    clientLabel: "Business Data Protection",
    outcomeLanguage:
      "ensures your critical data is securely backed up and recoverable after any disruption",
  },
  identity: {
    clientLabel: "Identity & Access Protection",
    outcomeLanguage:
      "protects employee identities and prevents unauthorized access to your systems",
  },
  firewall: {
    clientLabel: "Network Security",
    outcomeLanguage:
      "controls and monitors traffic to prevent unauthorized network access",
  },
  vulnerability_management: {
    clientLabel: "Vulnerability Management",
    outcomeLanguage:
      "keeps systems current and eliminates known security vulnerabilities before they can be exploited",
  },
  email_security: {
    clientLabel: "Email Threat Protection",
    outcomeLanguage:
      "blocks phishing, malware, and business email compromise before reaching your team",
  },
  dns_filtering: {
    clientLabel: "DNS & Web Filtering",
    outcomeLanguage:
      "prevents connections to malicious sites and enforces acceptable use policies",
  },
  mfa: {
    clientLabel: "Multi-Factor Authentication",
    outcomeLanguage:
      "requires additional verification to prevent unauthorized account access",
  },
  drp: {
    clientLabel: "Disaster Recovery",
    outcomeLanguage:
      "enables rapid recovery of business operations after a major incident or system failure",
  },
  security_awareness_training: {
    clientLabel: "Security Awareness Training",
    outcomeLanguage:
      "educates employees to recognize and avoid phishing, social engineering, and other common threats",
  },
  rmm: {
    clientLabel: "Proactive System Monitoring",
    outcomeLanguage:
      "continuously monitors your infrastructure health to prevent issues before they cause downtime",
  },
  psa: {
    clientLabel: "Service Management",
    outcomeLanguage:
      "coordinates service delivery and ensures timely resolution of support requests",
  },
  network_monitoring: {
    clientLabel: "Network Performance Monitoring",
    outcomeLanguage:
      "monitors network health and performance to maintain reliable connectivity",
  },
  documentation: {
    clientLabel: "IT Documentation & Knowledge Base",
    outcomeLanguage:
      "maintains comprehensive documentation of your environment for faster issue resolution",
  },
  pam: {
    clientLabel: "Privileged Access Control",
    outcomeLanguage:
      "controls and monitors access to your most sensitive systems and administrative functions",
  },
};

export interface ServiceTool {
  name: string;
  vendor: string;
  category: ToolCategory | string;
}

/** Translates tools into client-facing capability descriptions. */
export function translateToolsToOutcomeLanguage(
  tools: ServiceTool[]
): ToolTranslation[] {
  return tools.map((tool) => {
    const cat = (tool.category ?? "").toLowerCase().replace(/\s+/g, "_");
    const translation = TOOL_CATEGORY_TRANSLATIONS[cat];
    return {
      toolName: tool.name,
      category: tool.category ?? "Security Technology",
      clientDescription:
        translation?.clientLabel ?? tool.category ?? "Advanced Security Technology",
      outcomeContribution:
        translation?.outcomeLanguage ??
        "provides additional protection for your environment",
    };
  });
}

// ── Additional Service Translations ──────────────────────────────────────────

export const ADDITIONAL_SERVICE_TRANSLATIONS: Record<string, string> = {
  consulting:
    "expert consulting to assess, plan, and improve your security posture based on your specific business needs",
  help_desk:
    "direct access to technical support for your team, with defined response times and resolution targets",
  retainer:
    "guaranteed expert response if a security incident occurs, with defined response times and dedicated support",
  training:
    "customized security training programs to build your team's awareness and reduce human-factor risk",
  project:
    "dedicated project delivery for security initiatives, migrations, and infrastructure improvements",
  compliance:
    "ongoing compliance guidance to maintain regulatory standing and prepare for audits",
};

/** Translates an additional service to client-facing language. */
export function translateAdditionalService(
  name: string,
  category: string,
  description: string | null
): string {
  const translated = ADDITIONAL_SERVICE_TRANSLATIONS[category];
  if (translated) return translated;
  // Fallback to the service description or a generic statement
  return description || `${name} — professional services to support your business`;
}
