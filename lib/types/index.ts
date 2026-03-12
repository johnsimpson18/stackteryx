import type { Database } from "@/types/supabase";

// ── Enum types — sourced from generated types/supabase.ts ────────────────────

export type UserRole = Database["public"]["Enums"]["user_role"];
export type OrgRole = Database["public"]["Enums"]["org_role"];
export type ToolCategory = Database["public"]["Enums"]["tool_category"];
export type PricingModel = Database["public"]["Enums"]["pricing_model"];
export type AuditAction = Database["public"]["Enums"]["audit_action"];
export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];
export type BundleType = Database["public"]["Enums"]["bundle_type"];
export type RiskTier = Database["public"]["Enums"]["risk_tier"];
export type BundleStatus = Database["public"]["Enums"]["bundle_status"];

// ── Vendor / cost model enums ─────────────────────────────────
export type BillingBasis = Database["public"]["Enums"]["billing_basis"];
export type BillingCadence = Database["public"]["Enums"]["billing_cadence"];
export type DiscountType = Database["public"]["Enums"]["discount_type"];

// ── Multi-tenancy types ───────────────────────────────────────

// TODO: replace with generated type from types/supabase.ts
export interface Org {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  org_outcome_targets: string[] | null;
}

// TODO: replace with generated type from types/supabase.ts
export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMemberWithProfile extends OrgMember {
  display_name: string;
  is_active: boolean;
}

// Which metric drives a tiered_by_metric tool's tier lookup
export type TierMetric = "endpoints" | "users" | "headcount";

// Price type within a tiered_by_metric tier
export type TierPriceType = "unitMonthly" | "flatMonthly" | "annualFlat";

// ── Sell strategy (how MSP charges the customer) ──────────────────────────────

export type SellStrategy =
  | "cost_plus_margin"      // price = cost / (1 - targetMarginPct)
  | "monthly_flat_rate"     // MSP sets a fixed monthly price
  | "per_endpoint_monthly"  // MSP charges X per endpoint
  | "per_user_monthly";     // MSP charges X per user

export interface BundleAssumptions {
  endpoints: number;   // default 30
  users: number;       // default 30
  headcount?: number;  // total employees / headcount — defaults to endpoints if omitted
  org_count: number;   // default 1
  sites?: number;      // optional locations/sites
}

export interface SellConfig {
  strategy: SellStrategy;
  monthly_flat_price?: number;       // for monthly_flat_rate
  per_endpoint_sell_price?: number;  // for per_endpoint_monthly
  per_user_sell_price?: number;      // for per_user_monthly
  target_margin_pct?: number;        // for cost_plus_margin (0–1)
}

// ── Per-tool discount model ───────────────────────────────────────────────────

export interface ToolDiscount {
  percent_discount: number;   // 0–1, e.g. 0.1 = 10% off vendor cost
  flat_discount: number;      // flat $/mo reduction after percent
  min_monthly_commit: number; // minimum monthly bill even after discounts
}

export interface TierRule {
  // Used by both legacy "tiered" and "tiered_by_metric" models for range lookup
  minSeats: number;
  maxSeats: number | null;
  // Legacy field (used when priceType is absent or "unitMonthly" on old "tiered" tools)
  costPerSeat: number;
  // New fields for tiered_by_metric
  priceType?: TierPriceType;    // how cost is expressed within this tier
  unitPriceMonthly?: number;    // for priceType = "unitMonthly": rate × metric count
  flatMonthly?: number;         // for priceType = "flatMonthly": fixed monthly for this tier
  annualFlat?: number;          // for priceType = "annualFlat": yearly flat ÷ 12 per month
}

// TODO: replace with generated type from types/supabase.ts (sell_config is Json in generated)
// A named scenario with client-specific inputs, saved per bundle
export interface ScenarioInputs {
  id: string;
  bundle_id: string;
  name: string;
  endpoints: number;
  users: number;
  headcount: number;
  org_count: number;
  contract_term_months: number;
  sites: number;
  sell_config: SellConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// TODO: replace with generated type from types/supabase.ts
export interface Profile {
  id: string;
  display_name: string;
  role: UserRole;
  is_active: boolean;
  active_org_id: string | null;
  created_at: string;
  updated_at: string;
}

// TODO: replace with generated type from types/supabase.ts
export interface WorkspaceSettings {
  id: string;
  org_id: string;
  workspace_name: string;
  default_overhead_pct: number;
  default_labor_pct: number;
  default_target_margin_pct: number;
  red_zone_margin_pct: number;
  max_discount_no_approval_pct: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// TODO: replace with generated type from types/supabase.ts (tier_rules is Json in generated)
export interface Tool {
  id: string;
  org_id: string;
  name: string;
  vendor: string;
  category: ToolCategory;
  pricing_model: PricingModel;
  per_seat_cost: number;
  flat_monthly_cost: number;
  tier_rules: TierRule[];
  vendor_minimum_monthly: number | null;
  labor_cost_per_seat: number | null;
  support_complexity: number;
  renewal_uplift_pct: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // v2 cost model fields
  annual_flat_cost: number;        // used when pricing_model = "annual_flat"
  per_user_cost: number;           // used when pricing_model = "per_user"
  per_org_cost: number;            // used when pricing_model = "per_org"
  // v2 discount fields
  percent_discount: number;        // 0–1 fraction off vendor cost
  flat_discount: number;           // flat $/mo reduction after percent
  min_monthly_commit: number | null; // minimum total monthly bill
  // v2 tiered_by_metric field
  tier_metric?: TierMetric;        // which metric drives tier lookup (default: "endpoints")
}

// TODO: replace with generated type from types/supabase.ts (metadata is Json in generated)
export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// --- Phase 2: Bundles & Pricing ---

// TODO: replace with generated type from types/supabase.ts
export interface Bundle {
  id: string;
  org_id: string;
  name: string;
  bundle_type: BundleType;
  description: string;
  status: BundleStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Five-layer model & wizard state (migration 024)
  wizard_step_completed: number;
  outcome_layer_complete: boolean;
  stack_layer_complete: boolean;
  economics_layer_complete: boolean;
  enablement_layer_complete: boolean;
  last_ai_analysis_at: string | null;
  wizard_in_progress: boolean;
}

export interface BundleWithMeta extends Bundle {
  version_count: number;
  latest_mrr: number | null;
  latest_margin: number | null;
}

// TODO: replace with generated type from types/supabase.ts (pricing_flags, sell_config, assumptions are Json in generated)
export interface BundleVersion {
  id: string;
  bundle_id: string;
  version_number: number;
  seat_count: number;
  risk_tier: RiskTier;
  contract_term_months: number;
  target_margin_pct: number;
  overhead_pct: number;
  labor_pct: number;
  discount_pct: number;
  notes: string;
  computed_true_cost_per_seat: number | null;
  computed_suggested_price: number | null;
  computed_discounted_price: number | null;
  computed_margin_pre_discount: number | null;
  computed_margin_post_discount: number | null;
  computed_mrr: number | null;
  computed_arr: number | null;
  pricing_flags: PricingFlag[];
  created_by: string | null;
  created_at: string;
  // v2 sell-strategy fields (added in migration 004)
  sell_strategy?: SellStrategy;
  sell_config?: SellConfig;
  assumptions?: BundleAssumptions;
}

// TODO: replace with generated type from types/supabase.ts
export interface BundleVersionTool {
  id: string;
  bundle_version_id: string;
  tool_id: string;
  quantity_multiplier: number;
  tool?: Tool;
}

export interface BundleVersionWithTools extends BundleVersion {
  tools: BundleVersionTool[];
}

// --- Pricing Engine Types ---

export interface PricingToolInput {
  id: string;
  name: string;
  pricing_model: PricingModel;
  per_seat_cost: number;
  flat_monthly_cost: number;
  tier_rules: TierRule[];
  vendor_minimum_monthly: number | null;
  labor_cost_per_seat: number | null;
  quantity_multiplier: number;
  // v2 cost model fields (optional — default 0)
  annual_flat_cost?: number;
  per_user_cost?: number;
  per_org_cost?: number;
  // v2 discount fields (optional — default 0/null)
  percent_discount?: number;
  flat_discount?: number;
  min_monthly_commit?: number | null;
  // v2 tiered_by_metric field
  tier_metric?: TierMetric;
}

export interface PricingInput {
  tools: PricingToolInput[];
  seat_count: number;
  target_margin_pct: number;
  overhead_pct: number;
  labor_pct: number;
  discount_pct: number;
  red_zone_margin_pct: number;
  max_discount_no_approval_pct: number;
  contract_term_months: number;
  // v2 optional additions (calculatePricing ignores these — used by new functions)
  assumptions?: BundleAssumptions;
  sell_config?: SellConfig;
}

export interface PricingToolCost {
  tool_id: string;
  tool_name: string;
  raw_cost_per_seat: number;
  effective_cost_per_seat: number;
  labor_cost_per_seat: number;
  monthly_total: number;
  vendor_minimum_applied: boolean;
}

export interface PricingOutput {
  tool_costs: PricingToolCost[];
  blended_tool_cost_per_seat: number;
  total_labor_cost_per_seat: number;
  overhead_amount_per_seat: number;
  true_cost_per_seat: number;
  suggested_price_per_seat: number;
  discounted_price_per_seat: number;
  margin_pct_pre_discount: number;
  margin_pct_post_discount: number;
  total_mrr: number;
  total_arr: number;
  total_cost_mrr: number;
  total_monthly_margin: number;
  contract_total_revenue: number;
  flags: PricingFlag[];
  // v2 sell-strategy outputs (populated when sell_config provided)
  msp_sell_price_monthly: number;
  msp_gross_profit_monthly: number;
  msp_gross_margin_pct: number;
  normalized_tool_costs: Array<{
    tool_id: string;
    tool_name: string;
    normalized_monthly_cost: number;
    annotation: string | null;
  }>;
}

// ── v2 standalone result types ────────────────────────────────────────────────

export interface BundleCostResult {
  totalMonthlyCost: number;
  perToolBreakdown: Array<{
    toolId: string;
    toolName: string;
    monthlyCost: number;
    annotation: string | null;
  }>;
}

export interface SellPriceResult {
  sellPriceMonthly: number;
  grossProfit: number;
  grossMarginPct: number;
}

// --- Phase 3: Clients & Approvals ---

// TODO: replace with generated type from types/supabase.ts
export interface Client {
  id: string;
  org_id: string;
  name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  status: ClientStatus;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// TODO: replace with generated type from types/supabase.ts
export interface ClientContract {
  id: string;
  client_id: string;
  bundle_id: string;
  bundle_version_id: string;
  seat_count: number;
  start_date: string;
  end_date: string;
  monthly_revenue: number;
  monthly_cost: number;
  margin_pct: number;
  status: "active" | "expired" | "cancelled";
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContractWithMeta extends ClientContract {
  bundle_name: string;
  bundle_type: BundleType;
  version_number: number;
}

export interface ClientWithContracts extends Client {
  active_contract: ClientContractWithMeta | null;
  total_contracts: number;
}

// TODO: replace with generated type from types/supabase.ts
export interface Approval {
  id: string;
  org_id: string;
  bundle_id: string;
  bundle_version_id: string;
  requested_by: string;
  status: ApprovalStatus;
  discount_pct: number;
  margin_pct: number | null;
  mrr: number | null;
  seat_count: number | null;
  bundle_name: string;
  version_number: number;
  notes: string;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalWithMeta extends Approval {
  requester_name: string;
  reviewer_name: string | null;
}

export type PricingFlagType =
  | "red_zone_margin"
  | "approval_required"
  | "vendor_minimum_applied"
  | "negative_margin"
  | "zero_seats";

export type PricingFlagSeverity = "error" | "warning" | "info";

export interface PricingFlag {
  type: PricingFlagType;
  severity: PricingFlagSeverity;
  message: string;
  tool_id?: string;
}

// ── Vendor management types ──────────────────────────────────────────────────

export interface GlobalVendor {
  id: string;
  name: string;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface OrgVendor {
  id: string;
  org_id: string;
  vendor_id: string | null;
  display_name: string;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgVendorWithMeta extends OrgVendor {
  global_vendor_name: string | null;
  global_vendor_logo: string | null;
  cost_model_count: number;
}

export interface CostModel {
  id: string;
  org_vendor_id: string;
  org_id: string;
  name: string;
  billing_basis: BillingBasis;
  cadence: BillingCadence;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostModelTier {
  id: string;
  cost_model_id: string;
  min_value: number;
  max_value: number | null;
  unit_price: number;
}

export interface OrgVendorDiscount {
  id: string;
  org_vendor_id: string;
  discount_type: DiscountType;
  value: number | null;
}

export interface CostModelWithTiers extends CostModel {
  tiers: CostModelTier[];
}

export interface OrgVendorDetail extends OrgVendor {
  global_vendor_name: string | null;
  global_vendor_logo: string | null;
  cost_models: CostModelWithTiers[];
  discounts: OrgVendorDiscount[];
}

// ── Import types ─────────────────────────────────────────────────────────────

export type ImportStatus = "pending" | "processing" | "completed" | "failed" | "discarded";

export interface ExtractedVendor {
  vendor_name: string;
  category: string | null;
  cost_models: {
    name: string;
    billing_basis: BillingBasis;
    cadence: BillingCadence;
    tiers: { min_value: number; max_value: number | null; unit_price: number }[];
  }[];
}

export interface VendorImport {
  id: string;
  org_id: string;
  filename: string;
  status: ImportStatus;
  raw_extraction: ExtractedVendor[] | null;
  import_summary: { vendors_created: number; cost_models_created: number } | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

// ── Onboarding wizard types ──────────────────────────────────────────────────

export interface OnboardingProfile {
  company_size: string | null;
  primary_geographies: string[] | null;
  founder_name: string | null;
  founder_title: string | null;
  target_verticals: string[] | null;
  client_sizes: string[] | null;
  buyer_personas: string[] | null;
  services_offered: string[] | null;
  services_custom: string[] | null;
  sales_model: string | null;
  delivery_models: string[] | null;
  sales_team_type: string | null;
  target_margin_pct: number | null;
  compliance_targets: string[] | null;
  additional_context: string | null;
  onboarding_step: number;
  onboarding_complete: boolean;
  onboarding_completed_at: string | null;
  bundles_generated: boolean;
}

export interface OnboardingToolSelection {
  id: string;
  org_id: string;
  tool_name: string;
  vendor_name: string | null;
  category: string;
  is_custom: boolean;
  billing_basis: BillingBasis | null;
  cost_amount: number | null;
  sell_amount: number | null;
  min_commitment: number | null;
  min_units: number | null;
  pricing_entered: boolean;
  created_at: string;
}

export interface OnboardingToolPricing {
  billing_basis?: BillingBasis;
  cost_amount?: number | null;
  sell_amount?: number | null;
  min_commitment?: number | null;
  min_units?: number | null;
}

// ── Enablement types ─────────────────────────────────────────────────────────

export interface EnablementContent {
  service_overview: string;
  whats_included: string;
  talking_points: string;
  pricing_narrative: string;
  why_us: string;
}

export interface BundleEnablement extends EnablementContent {
  id: string;
  org_id: string;
  bundle_version_id: string;
  generated_at: string | null;
  updated_at: string;
  created_by: string | null;
  // AI context fields (migration 023)
  outcome_type: string | null;
  outcome_statement: string | null;
  target_vertical: string | null;
  target_persona: string | null;
  service_capabilities: ServiceCapability[] | null;
  ai_context_version: number;
}

// ── Service Outcomes (Outcome Layer) ────────────────────────────────────────

export interface ServiceCapability {
  name: string;
  description: string;
  met_by_tools: string[];
}

export interface ServiceOutcome {
  id: string;
  bundle_id: string;
  org_id: string;
  outcome_type: string;
  outcome_statement: string | null;
  target_vertical: string | null;
  target_persona: string | null;
  service_capabilities: ServiceCapability[];
  ai_drafted: boolean;
  created_at: string;
  updated_at: string;
}

// ── Proposals (Sales Studio) ────────────────────────────────────────────────

export interface ProposalServiceRef {
  bundle_id: string;
  pricing_version_id: string;
  service_name: string;
}

export interface ProposalContent {
  executive_summary: string;
  services_overview: Array<{ name: string; description: string }>;
  pricing_summary: string;
  why_us: string;
  risk_snapshot: string;
}

export type ProposalStatus = "draft" | "sent" | "archived";

export interface Proposal {
  id: string;
  org_id: string;
  client_id: string | null;
  prospect_name: string | null;
  prospect_industry: string | null;
  prospect_size: string | null;
  services_included: ProposalServiceRef[];
  content: ProposalContent;
  status: ProposalStatus;
  exported_pdf_url: string | null;
  exported_docx_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── AI Action Cards (Dashboard) ─────────────────────────────────────────────

export type ActionCardType =
  | "incomplete_service"
  | "margin_risk"
  | "renewal_alert"
  | "stale_proposal"
  | "vendor_cost_change";

export type ActionCardSeverity = "info" | "warning" | "critical";

export type ActionCardEntityType = "service" | "client" | "vendor" | "proposal";

export interface AIActionCard {
  id: string;
  org_id: string;
  card_type: ActionCardType;
  severity: ActionCardSeverity;
  title: string;
  body: string | null;
  cta_label: string | null;
  cta_href: string | null;
  entity_type: ActionCardEntityType | null;
  entity_id: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  expires_at: string | null;
}

// ── Service Completeness (read-only view) ───────────────────────────────────

export interface ServiceCompleteness {
  bundle_id: string;
  org_id: string;
  service_name: string;
  outcome_complete: boolean;
  service_complete: boolean;
  stack_complete: boolean;
  economics_complete: boolean;
  enablement_complete: boolean;
  layers_complete: number;
  completeness_pct: number;
}

// ── Tier Packages ────────────────────────────────────────────────────────────

export type TierPackageStatus = "draft" | "published" | "archived";

export interface TierPackage {
  id: string;
  org_id: string;
  name: string;
  description: string;
  status: TierPackageStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TierPackageItem {
  id: string;
  package_id: string;
  bundle_id: string;
  tier_label: string;
  sort_order: number;
  highlight: boolean;
  created_at: string;
  updated_at: string;
}

export interface TierPackageItemWithBundle extends TierPackageItem {
  bundle_name: string;
  bundle_type: BundleType;
  bundle_status: BundleStatus;
}

export interface TierPackageWithItems extends TierPackage {
  items: TierPackageItemWithBundle[];
}

export interface TierPackageWithMeta extends TierPackage {
  item_count: number;
}

// ── Additional Services ──────────────────────────────────────────────────────

export type AdditionalServiceCategory =
  | "consulting"
  | "help_desk"
  | "retainer"
  | "training"
  | "project"
  | "compliance";

export type AdditionalServiceBillingType =
  | "monthly"
  | "per_user"
  | "per_device"
  | "per_site"
  | "hourly"
  | "one_time";

export type AdditionalServiceCostType =
  | "internal_labor"
  | "subcontractor"
  | "zero_cost";

export type AdditionalServiceStatus = "active" | "draft" | "archived";

export interface AdditionalService {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: AdditionalServiceCategory;
  billing_type: AdditionalServiceBillingType;
  cost_type: AdditionalServiceCostType;
  cost: number;
  cost_unit: string | null;
  sell_price: number;
  sell_unit: string | null;
  margin_pct: number; // GENERATED column — never insert/update
  status: AdditionalServiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundleVersionAdditionalService {
  id: string;
  bundle_version_id: string;
  additional_service_id: string;
  org_id: string;
  cost_override: number | null;
  sell_price_override: number | null;
  quantity: number;
  sort_order: number;
  created_at: string;
}

export interface BundleVersionAdditionalServiceWithDetails
  extends BundleVersionAdditionalService {
  additional_service: AdditionalService;
  effective_cost: number;
  effective_sell_price: number;
  effective_margin_pct: number;
}

// Re-export recommendation types
export type {
  ClientProfile,
  BundleRecommendation,
  RecommendationResponse,
} from "./recommend";
