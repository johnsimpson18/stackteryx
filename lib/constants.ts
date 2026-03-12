import {
  LayoutDashboard,
  Wrench,
  Building2,
  Package,
  Layers,
  Settings,
  ShieldCheck,
  Shield,
  Users,
  FileText,
  PlusCircle,
  Briefcase,
  DollarSign,
} from "lucide-react";
import type { UserRole, OrgRole, ToolCategory, PricingModel, BundleType, BundleStatus, RiskTier, ClientStatus, ApprovalStatus } from "@/lib/types";

export type NavGroup = "primary" | "secondary";

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Build a Service",
    href: "/services/new",
    icon: PlusCircle,
    disabled: false,
    group: "primary" as NavGroup,
    accent: true,
  },
  {
    label: "Services",
    href: "/services",
    icon: Package,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Add-On Services",
    href: "/additional-services",
    icon: Briefcase,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Packages",
    href: "/packages",
    icon: Layers,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Pricing",
    href: "/pricing",
    icon: DollarSign,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Stack Catalog",
    href: "/stack-catalog",
    icon: Wrench,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Sales Studio",
    href: "/sales-studio",
    icon: FileText,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Compliance",
    href: "/compliance",
    icon: Shield,
    disabled: false,
    group: "primary" as NavGroup,
  },
  {
    label: "Vendors",
    href: "/vendors",
    icon: Building2,
    disabled: false,
    group: "secondary" as NavGroup,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    disabled: false,
    group: "secondary" as NavGroup,
  },
  {
    label: "Admin",
    href: "/admin",
    icon: ShieldCheck,
    disabled: false,
    group: "secondary" as NavGroup,
  },
] as const;

type Permission =
  | "view_tools"
  | "create_tools"
  | "edit_tools"
  | "deactivate_tools"
  | "update_settings"
  | "manage_members"
  | "view_audit_log"
  | "view_settings"
  | "view_bundles"
  | "create_bundles"
  | "edit_bundles"
  | "archive_bundles"
  | "create_versions"
  | "view_versions"
  | "view_clients"
  | "create_clients"
  | "edit_clients"
  | "view_approvals"
  | "manage_approvals";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "view_tools", "create_tools", "edit_tools", "deactivate_tools",
    "update_settings", "manage_members", "view_audit_log", "view_settings",
    "view_bundles", "create_bundles", "edit_bundles", "archive_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals", "manage_approvals",
  ],
  finance: [
    "view_tools", "create_tools", "edit_tools", "deactivate_tools",
    "view_audit_log", "view_settings",
    "view_bundles", "create_bundles", "edit_bundles", "archive_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals", "manage_approvals",
  ],
  sales: [
    "view_tools", "create_tools", "edit_tools",
    "view_settings",
    "view_bundles", "create_bundles", "edit_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals",
  ],
  viewer: [
    "view_tools", "view_settings",
    "view_bundles", "view_versions",
    "view_clients",
    "view_approvals",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ── Org role permissions (multi-tenancy) ──────────────────────

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  org_owner: [
    "view_tools", "create_tools", "edit_tools", "deactivate_tools",
    "update_settings", "manage_members", "view_audit_log", "view_settings",
    "view_bundles", "create_bundles", "edit_bundles", "archive_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals", "manage_approvals",
  ],
  admin: [
    "view_tools", "create_tools", "edit_tools", "deactivate_tools",
    "view_audit_log", "view_settings",
    "view_bundles", "create_bundles", "edit_bundles", "archive_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals", "manage_approvals",
  ],
  member: [
    "view_tools", "create_tools", "edit_tools",
    "view_settings",
    "view_bundles", "create_bundles", "edit_bundles",
    "create_versions", "view_versions",
    "view_clients", "create_clients", "edit_clients",
    "view_approvals",
  ],
  viewer: [
    "view_tools", "view_settings",
    "view_bundles", "view_versions",
    "view_clients",
    "view_approvals",
  ],
};

export function hasOrgPermission(role: OrgRole, permission: Permission): boolean {
  return ORG_ROLE_PERMISSIONS[role].includes(permission);
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edr: "EDR",
  siem: "SIEM",
  email_security: "Email Security",
  identity: "Identity",
  backup: "Backup",
  vulnerability_management: "Vuln Management",
  dns_filtering: "DNS Filtering",
  mfa: "MFA",
  security_awareness_training: "Security Awareness",
  documentation: "Documentation",
  rmm: "RMM",
  psa: "PSA",
  network_monitoring: "Network Monitoring",
  other: "Other",
};

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  per_seat: "Per Endpoint",
  flat_monthly: "Flat Monthly",
  tiered: "Tiered",
  per_user: "Per User",
  per_org: "Per Org",
  annual_flat: "Annual Flat",
  tiered_by_metric: "Tiered by Metric",
};

export const TOOL_CATEGORIES: ToolCategory[] = [
  "edr",
  "siem",
  "email_security",
  "identity",
  "backup",
  "vulnerability_management",
  "dns_filtering",
  "mfa",
  "security_awareness_training",
  "documentation",
  "rmm",
  "psa",
  "network_monitoring",
  "other",
];

export const PRICING_MODELS: PricingModel[] = [
  "per_seat",
  "per_user",
  "per_org",
  "flat_monthly",
  "annual_flat",
  "tiered",
  "tiered_by_metric",
];

import type { TierMetric } from "@/lib/types";

export const TIER_METRIC_LABELS: Record<TierMetric, string> = {
  endpoints: "Endpoints (devices)",
  users: "Users",
  headcount: "Headcount (employees)",
};

export const TIER_METRICS: TierMetric[] = ["endpoints", "users", "headcount"];

// ── Vendor / Cost model constants ─────────────────────────────

import type { BillingBasis, BillingCadence } from "@/lib/types";

export const BILLING_BASIS_LABELS: Record<BillingBasis, string> = {
  per_user: "Per User",
  per_device: "Per Device",
  per_domain: "Per Domain",
  per_location: "Per Location",
  per_org: "Per Org",
  flat_monthly: "Flat Monthly",
  usage: "Usage",
  tiered: "Tiered",
};

export const BILLING_BASIS_OPTIONS: BillingBasis[] = [
  "per_user",
  "per_device",
  "per_domain",
  "per_location",
  "per_org",
  "flat_monthly",
  "usage",
  "tiered",
];

export const CADENCE_LABELS: Record<BillingCadence, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

export const BUNDLE_TYPE_LABELS: Record<BundleType, string> = {
  ala_carte: "A La Carte",
  tiered: "Tiered",
  vertical: "Vertical",
  custom: "Custom",
};

export const BUNDLE_TYPES: BundleType[] = [
  "ala_carte",
  "tiered",
  "vertical",
  "custom",
];

export const BUNDLE_STATUS_LABELS: Record<BundleStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const RISK_TIER_LABELS: Record<RiskTier, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const RISK_TIERS: RiskTier[] = ["low", "medium", "high"];

/* ── Category color system — the "Stack Blocks" ──────────────── */
export const CATEGORY_COLORS: Record<
  ToolCategory,
  { bg: string; text: string; border: string; dot: string }
> = {
  edr:                         { bg: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/20",     dot: "bg-red-500" },
  siem:                        { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20",  dot: "bg-violet-500" },
  email_security:              { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",    dot: "bg-blue-500" },
  identity:                    { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   dot: "bg-amber-500" },
  backup:                      { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  vulnerability_management:    { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20",  dot: "bg-orange-500" },
  dns_filtering:               { bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20",    dot: "bg-cyan-500" },
  mfa:                         { bg: "bg-pink-500/10",    text: "text-pink-400",    border: "border-pink-500/20",    dot: "bg-pink-500" },
  security_awareness_training: { bg: "bg-lime-500/10",    text: "text-lime-400",    border: "border-lime-500/20",    dot: "bg-lime-500" },
  documentation:               { bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/20",   dot: "bg-slate-400" },
  rmm:                         { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20",  dot: "bg-purple-500" },
  psa:                         { bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20",    dot: "bg-teal-500" },
  network_monitoring:          { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20",     dot: "bg-sky-500" },
  other:                       { bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/20",   dot: "bg-slate-400" },
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  churned: "Churned",
};

export const CLIENT_STATUSES: ClientStatus[] = ["prospect", "active", "churned"];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export const INDUSTRY_OPTIONS = [
  "Healthcare",
  "Finance & Banking",
  "Legal",
  "Manufacturing",
  "Retail",
  "Education",
  "Government",
  "Non-Profit",
  "Technology",
  "Professional Services",
  "Construction",
  "Real Estate",
  "Hospitality",
  "Transportation",
  "Other",
] as const;

export type Industry = (typeof INDUSTRY_OPTIONS)[number];
