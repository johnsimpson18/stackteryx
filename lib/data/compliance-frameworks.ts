// Static compliance framework definitions.
// ToolDomain values map to tool categories via TOOL_DOMAIN_TO_CATEGORY in lib/compliance/scoring.ts.

export type ToolDomain =
  | "EDR"
  | "Email Security"
  | "Backup"
  | "Identity"
  | "Network"
  | "Training"
  | "SIEM"
  | "Vulnerability Management"
  | "MDR"
  | "DLP"
  | "MDM"
  | "DNS";

export interface ComplianceControl {
  id: string;
  domain: string;
  domainCode: string;
  name: string;
  description: string;
  requirementType: "any" | "all" | "manual";
  toolDomains: ToolDomain[];
  outOfScopeReason?: string;
  weight: number;
}

export interface ComplianceDomain {
  code: string;
  name: string;
  controls: ComplianceControl[];
}

export interface ComplianceFramework {
  id: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  targetAudience: string;
  assessmentDisclaimer: string;
  domains: ComplianceDomain[];
}

const DISCLAIMER =
  "This assessment estimates control coverage based on delivered services and mapped security tooling. Administrative, procedural, and physical safeguards require manual validation and are excluded from the automated score. This report does not constitute a formal compliance audit. Engage a certified assessor for official certification.";

// ── CMMC Level 1 — 17 Practices across 6 Domains ──────────────────────────

const CMMC_L1_DOMAINS: ComplianceDomain[] = [
  {
    code: "AC",
    name: "Access Control",
    controls: [
      { id: "CMMC-AC.L1-3.1.1", domain: "Access Control", domainCode: "AC", name: "Authorized Access Control", description: "Limit system access to authorized users, processes acting on behalf of authorized users, and devices (including other systems).", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
      { id: "CMMC-AC.L1-3.1.2", domain: "Access Control", domainCode: "AC", name: "Transaction & Function Control", description: "Limit system access to the types of transactions and functions that authorized users are permitted to execute.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
      { id: "CMMC-AC.L1-3.1.20", domain: "Access Control", domainCode: "AC", name: "External Connections", description: "Verify and control/limit connections to external systems.", requirementType: "any", toolDomains: ["Network"], weight: 2 },
      { id: "CMMC-AC.L1-3.1.22", domain: "Access Control", domainCode: "AC", name: "Control Public Information", description: "Control CUI posted or processed on publicly accessible systems.", requirementType: "manual", toolDomains: [], weight: 1, outOfScopeReason: "Requires policy and administrative controls — cannot be assessed by tooling." },
    ],
  },
  {
    code: "IA",
    name: "Identification and Authentication",
    controls: [
      { id: "CMMC-IA.L1-3.5.1", domain: "Identification and Authentication", domainCode: "IA", name: "Identification", description: "Identify system users, processes acting on behalf of users, and devices.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
      { id: "CMMC-IA.L1-3.5.2", domain: "Identification and Authentication", domainCode: "IA", name: "Authentication", description: "Authenticate (or verify) the identities of users, processes, or devices before allowing access.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
    ],
  },
  {
    code: "MP",
    name: "Media Protection",
    controls: [
      { id: "CMMC-MP.L1-3.8.3", domain: "Media Protection", domainCode: "MP", name: "Media Sanitization", description: "Sanitize or destroy system media containing CUI before disposal or reuse.", requirementType: "manual", toolDomains: [], weight: 1, outOfScopeReason: "Physical media handling — requires procedural controls." },
    ],
  },
  {
    code: "PE",
    name: "Physical Protection",
    controls: [
      { id: "CMMC-PE.L1-3.10.1", domain: "Physical Protection", domainCode: "PE", name: "Limit Physical Access", description: "Limit physical access to systems to authorized individuals.", requirementType: "manual", toolDomains: [], weight: 1, outOfScopeReason: "Physical access control — cannot be assessed by software tooling." },
      { id: "CMMC-PE.L1-3.10.3", domain: "Physical Protection", domainCode: "PE", name: "Escort Visitors", description: "Escort visitors and monitor visitor activity.", requirementType: "manual", toolDomains: [], weight: 1, outOfScopeReason: "Physical security procedure — out of scope for software assessment." },
    ],
  },
  {
    code: "SC",
    name: "System and Communications Protection",
    controls: [
      { id: "CMMC-SC.L1-3.13.1", domain: "System and Communications Protection", domainCode: "SC", name: "Boundary Protection", description: "Monitor, control, and protect communications at the external boundaries and key internal boundaries.", requirementType: "any", toolDomains: ["Network"], weight: 2 },
      { id: "CMMC-SC.L1-3.13.5", domain: "System and Communications Protection", domainCode: "SC", name: "Public-Access System Separation", description: "Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.", requirementType: "any", toolDomains: ["Network"], weight: 2 },
    ],
  },
  {
    code: "SI",
    name: "System and Information Integrity",
    controls: [
      { id: "CMMC-SI.L1-3.14.1", domain: "System and Information Integrity", domainCode: "SI", name: "Flaw Remediation", description: "Identify, report, and correct system flaws in a timely manner.", requirementType: "any", toolDomains: ["EDR", "MDR"], weight: 3 },
      { id: "CMMC-SI.L1-3.14.2", domain: "System and Information Integrity", domainCode: "SI", name: "Malicious Code Protection", description: "Provide protection from malicious code at appropriate locations within organizational systems.", requirementType: "any", toolDomains: ["EDR", "MDR"], weight: 3 },
      { id: "CMMC-SI.L1-3.14.3", domain: "System and Information Integrity", domainCode: "SI", name: "Security Alerts, Advisories, and Directives", description: "Monitor system security alerts and advisories and take action in response.", requirementType: "any", toolDomains: ["EDR", "MDR"], weight: 2 },
      { id: "CMMC-SI.L1-3.14.4", domain: "System and Information Integrity", domainCode: "SI", name: "Update Malicious Code Protection", description: "Update malicious code protection mechanisms when new releases are available.", requirementType: "any", toolDomains: ["EDR"], weight: 2 },
      { id: "CMMC-SI.L1-3.14.5", domain: "System and Information Integrity", domainCode: "SI", name: "System & File Scanning", description: "Perform periodic scans of systems and real-time scans of files from external sources.", requirementType: "any", toolDomains: ["EDR", "MDR"], weight: 2 },
      { id: "CMMC-SI.L1-3.14.6", domain: "System and Information Integrity", domainCode: "SI", name: "Attack Monitoring", description: "Monitor systems to detect attacks and indicators of potential attacks.", requirementType: "any", toolDomains: ["SIEM", "MDR"], weight: 2 },
    ],
  },
];

// ── CMMC Level 2 — All L1 practices plus additional L2 practices ───────────

function cmmcL2Domains(): ComplianceDomain[] {
  // Start with deep copy of L1 domains
  const domains: ComplianceDomain[] = CMMC_L1_DOMAINS.map((d) => ({
    ...d,
    controls: [...d.controls],
  }));

  function findOrCreateDomain(code: string, name: string): ComplianceDomain {
    let d = domains.find((dom) => dom.code === code);
    if (!d) {
      d = { code, name, controls: [] };
      domains.push(d);
    }
    return d;
  }

  // AC additions
  const ac = findOrCreateDomain("AC", "Access Control");
  ac.controls.push(
    { id: "CMMC-AC.L2-3.1.3", domain: "Access Control", domainCode: "AC", name: "CUI Flow Enforcement", description: "Control the flow of CUI in accordance with approved authorizations.", requirementType: "any", toolDomains: ["DLP", "Network"], weight: 2 },
    { id: "CMMC-AC.L2-3.1.5", domain: "Access Control", domainCode: "AC", name: "Least Privilege", description: "Employ the principle of least privilege, including for specific security functions and privileged accounts.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
    { id: "CMMC-AC.L2-3.1.6", domain: "Access Control", domainCode: "AC", name: "Non-Privileged Account Use", description: "Use non-privileged accounts when accessing non-security functions.", requirementType: "any", toolDomains: ["Identity"], weight: 2 },
    { id: "CMMC-AC.L2-3.1.12", domain: "Access Control", domainCode: "AC", name: "Remote Access Control", description: "Monitor and control remote access sessions.", requirementType: "any", toolDomains: ["Network", "Identity"], weight: 2 },
    { id: "CMMC-AC.L2-3.1.13", domain: "Access Control", domainCode: "AC", name: "Remote Access Confidentiality", description: "Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.", requirementType: "any", toolDomains: ["Network"], weight: 3 },
    { id: "CMMC-AC.L2-3.1.14", domain: "Access Control", domainCode: "AC", name: "Remote Access Routing", description: "Route remote access via managed access control points.", requirementType: "manual", toolDomains: [], weight: 2, outOfScopeReason: "Requires network architecture validation — manual assessment needed." },
  );

  // AU domain
  const au = findOrCreateDomain("AU", "Audit and Accountability");
  au.controls.push(
    { id: "CMMC-AU.L2-3.3.1", domain: "Audit and Accountability", domainCode: "AU", name: "System Auditing", description: "Create and retain system audit logs to enable monitoring, analysis, investigation, and reporting of unlawful or unauthorized activity.", requirementType: "any", toolDomains: ["SIEM"], weight: 3 },
    { id: "CMMC-AU.L2-3.3.2", domain: "Audit and Accountability", domainCode: "AU", name: "User Accountability", description: "Ensure the actions of individual users can be uniquely traced to those users.", requirementType: "any", toolDomains: ["SIEM"], weight: 2 },
  );

  // AT domain
  const at = findOrCreateDomain("AT", "Awareness and Training");
  at.controls.push(
    { id: "CMMC-AT.L2-3.2.1", domain: "Awareness and Training", domainCode: "AT", name: "Risk Awareness", description: "Ensure personnel are aware of the security risks associated with their activities.", requirementType: "any", toolDomains: ["Training"], weight: 2 },
    { id: "CMMC-AT.L2-3.2.2", domain: "Awareness and Training", domainCode: "AT", name: "Role-Based Training", description: "Ensure personnel are trained to carry out assigned security responsibilities.", requirementType: "any", toolDomains: ["Training"], weight: 2 },
  );

  // CM domain
  const cm = findOrCreateDomain("CM", "Configuration Management");
  cm.controls.push(
    { id: "CMMC-CM.L2-3.4.1", domain: "Configuration Management", domainCode: "CM", name: "Baseline Configuration", description: "Establish and maintain baseline configurations for systems.", requirementType: "any", toolDomains: ["EDR", "MDM"], weight: 2 },
    { id: "CMMC-CM.L2-3.4.2", domain: "Configuration Management", domainCode: "CM", name: "Configuration Settings", description: "Establish and enforce security configuration settings.", requirementType: "any", toolDomains: ["EDR", "MDM"], weight: 2 },
  );

  // IA additions
  const ia = findOrCreateDomain("IA", "Identification and Authentication");
  ia.controls.push(
    { id: "CMMC-IA.L2-3.5.3", domain: "Identification and Authentication", domainCode: "IA", name: "Multifactor Authentication", description: "Use multifactor authentication for local and network access to privileged accounts.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
    { id: "CMMC-IA.L2-3.5.4", domain: "Identification and Authentication", domainCode: "IA", name: "Replay-Resistant Authentication", description: "Employ replay-resistant authentication mechanisms.", requirementType: "any", toolDomains: ["Identity"], weight: 2 },
  );

  // IR domain
  const ir = findOrCreateDomain("IR", "Incident Response");
  ir.controls.push(
    { id: "CMMC-IR.L2-3.6.1", domain: "Incident Response", domainCode: "IR", name: "Incident Handling", description: "Establish an operational incident-handling capability including preparation, detection, analysis, containment, recovery, and user response activities.", requirementType: "any", toolDomains: ["MDR", "SIEM"], weight: 3 },
    { id: "CMMC-IR.L2-3.6.2", domain: "Incident Response", domainCode: "IR", name: "Incident Reporting", description: "Track, document, and report incidents to designated officials.", requirementType: "any", toolDomains: ["MDR", "SIEM"], weight: 2 },
  );

  // RA domain
  const ra = findOrCreateDomain("RA", "Risk Assessment");
  ra.controls.push(
    { id: "CMMC-RA.L2-3.11.1", domain: "Risk Assessment", domainCode: "RA", name: "Risk Assessment", description: "Periodically assess the risk to organizational operations, assets, and individuals.", requirementType: "any", toolDomains: ["Vulnerability Management"], weight: 3 },
    { id: "CMMC-RA.L2-3.11.2", domain: "Risk Assessment", domainCode: "RA", name: "Vulnerability Scanning", description: "Scan for vulnerabilities in systems periodically and when new vulnerabilities are identified.", requirementType: "any", toolDomains: ["Vulnerability Management"], weight: 3 },
  );

  // SC additions
  const sc = findOrCreateDomain("SC", "System and Communications Protection");
  sc.controls.push(
    { id: "CMMC-SC.L2-3.13.8", domain: "System and Communications Protection", domainCode: "SC", name: "CUI Transmission Confidentiality", description: "Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission.", requirementType: "any", toolDomains: ["Network", "Email Security"], weight: 3 },
    { id: "CMMC-SC.L2-3.13.11", domain: "System and Communications Protection", domainCode: "SC", name: "FIPS-Validated Cryptography", description: "Employ FIPS-validated cryptography.", requirementType: "any", toolDomains: ["EDR", "Network"], weight: 2 },
  );

  return domains;
}

// ── HIPAA Security Rule ────────────────────────────────────────────────────

const HIPAA_DOMAINS: ComplianceDomain[] = [
  {
    code: "AC",
    name: "Access Control",
    controls: [
      { id: "HIPAA-164.312(a)(1)", domain: "Access Control", domainCode: "AC", name: "Access Control", description: "Implement technical policies and procedures to allow access only to authorized persons or software programs.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
      { id: "HIPAA-164.312(a)(2)(i)", domain: "Access Control", domainCode: "AC", name: "Unique User Identification", description: "Assign a unique name or number for identifying and tracking user identity.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
      { id: "HIPAA-164.312(a)(2)(iii)", domain: "Access Control", domainCode: "AC", name: "Automatic Logoff", description: "Implement electronic procedures that terminate an electronic session after a predetermined time of inactivity.", requirementType: "any", toolDomains: ["Identity"], weight: 2 },
      { id: "HIPAA-164.312(a)(2)(iv)", domain: "Access Control", domainCode: "AC", name: "Encryption and Decryption", description: "Implement a mechanism to encrypt and decrypt electronic protected health information.", requirementType: "any", toolDomains: ["Identity", "Network"], weight: 3 },
    ],
  },
  {
    code: "AU",
    name: "Audit Controls",
    controls: [
      { id: "HIPAA-164.312(b)", domain: "Audit Controls", domainCode: "AU", name: "Audit Controls", description: "Implement hardware, software, and/or procedural mechanisms to record and examine activity in information systems.", requirementType: "any", toolDomains: ["SIEM"], weight: 3 },
    ],
  },
  {
    code: "INT",
    name: "Integrity",
    controls: [
      { id: "HIPAA-164.312(c)(1)", domain: "Integrity", domainCode: "INT", name: "Integrity Controls", description: "Implement policies and procedures to protect ePHI from improper alteration or destruction.", requirementType: "any", toolDomains: ["Backup", "EDR"], weight: 2 },
    ],
  },
  {
    code: "AUTH",
    name: "Authentication",
    controls: [
      { id: "HIPAA-164.312(d)", domain: "Authentication", domainCode: "AUTH", name: "Person or Entity Authentication", description: "Implement procedures to verify that a person seeking access is the one claimed.", requirementType: "any", toolDomains: ["Identity"], weight: 3 },
    ],
  },
  {
    code: "TS",
    name: "Transmission Security",
    controls: [
      { id: "HIPAA-164.312(e)(1)", domain: "Transmission Security", domainCode: "TS", name: "Transmission Security", description: "Implement technical security measures to guard against unauthorized access to ePHI over electronic networks.", requirementType: "any", toolDomains: ["Network", "Email Security"], weight: 3 },
    ],
  },
  {
    code: "RA",
    name: "Risk Analysis",
    controls: [
      { id: "HIPAA-164.308(a)(1)", domain: "Risk Analysis", domainCode: "RA", name: "Risk Analysis", description: "Conduct an accurate and thorough assessment of potential risks and vulnerabilities.", requirementType: "any", toolDomains: ["Vulnerability Management"], weight: 3 },
    ],
  },
  {
    code: "WT",
    name: "Workforce Training",
    controls: [
      { id: "HIPAA-164.308(a)(5)", domain: "Workforce Training", domainCode: "WT", name: "Security Awareness Training", description: "Implement a security awareness and training program for all workforce members.", requirementType: "any", toolDomains: ["Training"], weight: 2 },
    ],
  },
  {
    code: "CP",
    name: "Contingency Planning",
    controls: [
      { id: "HIPAA-164.308(a)(7)", domain: "Contingency Planning", domainCode: "CP", name: "Contingency Plan", description: "Establish and implement policies and procedures for responding to an emergency that damages systems.", requirementType: "all", toolDomains: ["Backup"], weight: 3 },
    ],
  },
  {
    code: "PS",
    name: "Physical Safeguards",
    controls: [
      { id: "HIPAA-164.310(a)(1)", domain: "Physical Safeguards", domainCode: "PS", name: "Facility Access Controls", description: "Implement policies to limit physical access to electronic information systems.", requirementType: "manual", toolDomains: [], weight: 1, outOfScopeReason: "Physical safeguard — requires manual validation." },
    ],
  },
  {
    code: "DC",
    name: "Device Controls",
    controls: [
      { id: "HIPAA-164.310(d)(1)", domain: "Device Controls", domainCode: "DC", name: "Device and Media Controls", description: "Implement policies governing the receipt and removal of hardware and electronic media.", requirementType: "any", toolDomains: ["MDM", "EDR"], weight: 2 },
    ],
  },
];

// ── NIST CSF ───────────────────────────────────────────────────────────────

const NIST_CSF_DOMAINS: ComplianceDomain[] = [
  {
    code: "ID",
    name: "Identify",
    controls: [
      { id: "NIST-ID.AM", domain: "Identify", domainCode: "ID", name: "Asset Management", description: "Asset Management: The data, personnel, devices, systems, and facilities are identified and managed.", requirementType: "any", toolDomains: ["Vulnerability Management", "MDM"], weight: 2 },
      { id: "NIST-ID.RA", domain: "Identify", domainCode: "ID", name: "Risk Assessment", description: "Risk Assessment: Threats, vulnerabilities, likelihoods and impacts are identified and used to determine risk.", requirementType: "any", toolDomains: ["Vulnerability Management"], weight: 3 },
    ],
  },
  {
    code: "PR",
    name: "Protect",
    controls: [
      { id: "NIST-PR.AC", domain: "Protect", domainCode: "PR", name: "Access Control", description: "Identity Management and Access Control: Access is limited to assets and facilities.", requirementType: "all", toolDomains: ["Identity", "Network"], weight: 3 },
      { id: "NIST-PR.AT", domain: "Protect", domainCode: "PR", name: "Awareness and Training", description: "Awareness and Training: Personnel are provided security awareness education.", requirementType: "any", toolDomains: ["Training"], weight: 2 },
      { id: "NIST-PR.DS", domain: "Protect", domainCode: "PR", name: "Data Security", description: "Data Security: Data is managed consistent with the organization's risk strategy.", requirementType: "any", toolDomains: ["Backup", "DLP", "Email Security"], weight: 3 },
      { id: "NIST-PR.IP", domain: "Protect", domainCode: "PR", name: "Information Protection", description: "Information Protection: Security policies and processes are maintained and used.", requirementType: "any", toolDomains: ["EDR", "MDM"], weight: 2 },
      { id: "NIST-PR.PT", domain: "Protect", domainCode: "PR", name: "Protective Technology", description: "Protective Technology: Technical security solutions are managed.", requirementType: "any", toolDomains: ["Network", "EDR"], weight: 2 },
    ],
  },
  {
    code: "DE",
    name: "Detect",
    controls: [
      { id: "NIST-DE.CM", domain: "Detect", domainCode: "DE", name: "Security Continuous Monitoring", description: "Security Continuous Monitoring: Assets are monitored at discrete intervals.", requirementType: "any", toolDomains: ["SIEM", "MDR", "EDR"], weight: 3 },
      { id: "NIST-DE.AE", domain: "Detect", domainCode: "DE", name: "Anomalies and Events", description: "Anomalies and Events: Anomalous activity is detected in a timely manner.", requirementType: "any", toolDomains: ["SIEM", "MDR"], weight: 3 },
    ],
  },
  {
    code: "RS",
    name: "Respond",
    controls: [
      { id: "NIST-RS.RP", domain: "Respond", domainCode: "RS", name: "Response Planning", description: "Response Planning: Response processes and procedures are executed during and after an incident.", requirementType: "any", toolDomains: ["MDR", "SIEM"], weight: 3 },
    ],
  },
  {
    code: "RC",
    name: "Recover",
    controls: [
      { id: "NIST-RC.RP", domain: "Recover", domainCode: "RC", name: "Recovery Planning", description: "Recovery Planning: Recovery processes are executed to restore systems affected by cybersecurity incidents.", requirementType: "any", toolDomains: ["Backup"], weight: 3 },
    ],
  },
];

// ── Framework registry ─────────────────────────────────────────────────────

export const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: "cmmc_l1",
    name: "CMMC Level 1",
    shortName: "CMMC L1",
    version: "Rev 2.0",
    description: "Cybersecurity Maturity Model Certification Level 1 — Foundational. Focuses on safeguarding Federal Contract Information (FCI).",
    targetAudience: "DoD contractors handling FCI",
    assessmentDisclaimer: DISCLAIMER,
    domains: CMMC_L1_DOMAINS,
  },
  {
    id: "cmmc_l2",
    name: "CMMC Level 2",
    shortName: "CMMC L2",
    version: "Rev 2.0",
    description: "Cybersecurity Maturity Model Certification Level 2 — Advanced. Covers safeguarding Controlled Unclassified Information (CUI) with 110 practices from NIST SP 800-171.",
    targetAudience: "DoD contractors handling CUI",
    assessmentDisclaimer: DISCLAIMER,
    domains: cmmcL2Domains(),
  },
  {
    id: "hipaa",
    name: "HIPAA Security Rule",
    shortName: "HIPAA",
    version: "45 CFR Part 164",
    description: "Health Insurance Portability and Accountability Act Security Rule — technical, administrative, and physical safeguards for electronic Protected Health Information (ePHI).",
    targetAudience: "Healthcare providers, insurers, and business associates",
    assessmentDisclaimer: DISCLAIMER,
    domains: HIPAA_DOMAINS,
  },
  {
    id: "nist_csf",
    name: "NIST Cybersecurity Framework",
    shortName: "NIST CSF",
    version: "v1.1",
    description: "National Institute of Standards and Technology Cybersecurity Framework — voluntary framework for managing and reducing cybersecurity risk.",
    targetAudience: "All organizations seeking structured cybersecurity risk management",
    assessmentDisclaimer: DISCLAIMER,
    domains: NIST_CSF_DOMAINS,
  },
];

export function getAllFrameworks(): ComplianceFramework[] {
  return COMPLIANCE_FRAMEWORKS;
}

export function getFrameworkById(id: string): ComplianceFramework | undefined {
  return COMPLIANCE_FRAMEWORKS.find((f) => f.id === id);
}

export function getAllControls(framework: ComplianceFramework): ComplianceControl[] {
  return framework.domains.flatMap((d) => d.controls);
}

export function getControlCount(framework: ComplianceFramework): {
  total: number;
  scorable: number;
  manual: number;
} {
  const all = getAllControls(framework);
  const manual = all.filter((c) => c.requirementType === "manual").length;
  return { total: all.length, scorable: all.length - manual, manual };
}
