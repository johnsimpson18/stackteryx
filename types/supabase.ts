export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      approvals: {
        Row: {
          id: string
          bundle_id: string
          bundle_version_id: string
          requested_by: string
          status: Database["public"]["Enums"]["approval_status"]
          discount_pct: number
          margin_pct: number | null
          mrr: number | null
          seat_count: number | null
          bundle_name: string
          version_number: number
          notes: string
          reviewer_id: string | null
          reviewed_at: string | null
          review_notes: string
          created_at: string
          updated_at: string
          org_id: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          bundle_id: string
          bundle_version_id: string
          requested_by: string
          status?: Database["public"]["Enums"]["approval_status"]
          discount_pct: number
          margin_pct?: number | null
          mrr?: number | null
          seat_count?: number | null
          bundle_name?: string
          version_number?: number
          notes?: string
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_notes?: string
          created_at?: string
          updated_at?: string
          org_id: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bundle_id?: string
          bundle_version_id?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["approval_status"]
          discount_pct?: number
          margin_pct?: number | null
          mrr?: number | null
          seat_count?: number | null
          bundle_name?: string
          version_number?: number
          notes?: string
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_notes?: string
          created_at?: string
          updated_at?: string
          org_id?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: Database["public"]["Enums"]["audit_action"]
          entity_type: string
          entity_id: string | null
          metadata: Json | null
          created_at: string
          org_id: string
          table_name: string | null
          before: Json | null
          after: Json | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: Database["public"]["Enums"]["audit_action"]
          entity_type: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
          org_id: string
          table_name?: string | null
          before?: Json | null
          after?: Json | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: Database["public"]["Enums"]["audit_action"]
          entity_type?: string
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
          org_id?: string
          table_name?: string | null
          before?: Json | null
          after?: Json | null
        }
        Relationships: []
      }
      bundle_version_tools: {
        Row: {
          id: string
          bundle_version_id: string
          tool_id: string
          quantity_multiplier: number
        }
        Insert: {
          id?: string
          bundle_version_id: string
          tool_id: string
          quantity_multiplier?: number
        }
        Update: {
          id?: string
          bundle_version_id?: string
          tool_id?: string
          quantity_multiplier?: number
        }
        Relationships: []
      }
      bundle_versions: {
        Row: {
          id: string
          bundle_id: string
          version_number: number
          seat_count: number
          risk_tier: Database["public"]["Enums"]["risk_tier"]
          contract_term_months: number
          target_margin_pct: number
          overhead_pct: number
          labor_pct: number
          discount_pct: number
          notes: string | null
          computed_true_cost_per_seat: number | null
          computed_suggested_price: number | null
          computed_discounted_price: number | null
          computed_margin_pre_discount: number | null
          computed_margin_post_discount: number | null
          computed_mrr: number | null
          computed_arr: number | null
          pricing_flags: Json | null
          created_by: string | null
          created_at: string
          sell_strategy: string
          sell_config: Json
          assumptions: Json
        }
        Insert: {
          id?: string
          bundle_id: string
          version_number: number
          seat_count: number
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          contract_term_months?: number
          target_margin_pct?: number
          overhead_pct?: number
          labor_pct?: number
          discount_pct?: number
          notes?: string | null
          computed_true_cost_per_seat?: number | null
          computed_suggested_price?: number | null
          computed_discounted_price?: number | null
          computed_margin_pre_discount?: number | null
          computed_margin_post_discount?: number | null
          computed_mrr?: number | null
          computed_arr?: number | null
          pricing_flags?: Json | null
          created_by?: string | null
          created_at?: string
          sell_strategy?: string
          sell_config?: Json
          assumptions?: Json
        }
        Update: {
          id?: string
          bundle_id?: string
          version_number?: number
          seat_count?: number
          risk_tier?: Database["public"]["Enums"]["risk_tier"]
          contract_term_months?: number
          target_margin_pct?: number
          overhead_pct?: number
          labor_pct?: number
          discount_pct?: number
          notes?: string | null
          computed_true_cost_per_seat?: number | null
          computed_suggested_price?: number | null
          computed_discounted_price?: number | null
          computed_margin_pre_discount?: number | null
          computed_margin_post_discount?: number | null
          computed_mrr?: number | null
          computed_arr?: number | null
          pricing_flags?: Json | null
          created_by?: string | null
          created_at?: string
          sell_strategy?: string
          sell_config?: Json
          assumptions?: Json
        }
        Relationships: []
      }
      bundles: {
        Row: {
          id: string
          name: string
          bundle_type: Database["public"]["Enums"]["bundle_type"]
          description: string | null
          status: Database["public"]["Enums"]["bundle_status"]
          created_by: string | null
          created_at: string
          updated_at: string
          org_id: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          description?: string | null
          status?: Database["public"]["Enums"]["bundle_status"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
          org_id: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          bundle_type?: Database["public"]["Enums"]["bundle_type"]
          description?: string | null
          status?: Database["public"]["Enums"]["bundle_status"]
          created_by?: string | null
          created_at?: string
          updated_at?: string
          org_id?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      client_contracts: {
        Row: {
          id: string
          client_id: string
          bundle_id: string
          bundle_version_id: string
          seat_count: number
          start_date: string
          end_date: string
          monthly_revenue: number
          monthly_cost: number
          margin_pct: number
          status: string
          notes: string
          created_by: string | null
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          client_id: string
          bundle_id: string
          bundle_version_id: string
          seat_count: number
          start_date?: string
          end_date: string
          monthly_revenue?: number
          monthly_cost?: number
          margin_pct?: number
          status?: string
          notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          bundle_id?: string
          bundle_version_id?: string
          seat_count?: number
          start_date?: string
          end_date?: string
          monthly_revenue?: number
          monthly_cost?: number
          margin_pct?: number
          status?: string
          notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bundle_enablement: {
        Row: {
          id: string
          org_id: string
          bundle_version_id: string
          service_overview: string | null
          whats_included: string | null
          talking_points: string | null
          pricing_narrative: string | null
          why_us: string | null
          generated_at: string | null
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          bundle_version_id: string
          service_overview?: string | null
          whats_included?: string | null
          talking_points?: string | null
          pricing_narrative?: string | null
          why_us?: string | null
          generated_at?: string | null
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          bundle_version_id?: string
          service_overview?: string | null
          whats_included?: string | null
          talking_points?: string | null
          pricing_narrative?: string | null
          why_us?: string | null
          generated_at?: string | null
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          industry: string
          contact_name: string
          contact_email: string
          status: Database["public"]["Enums"]["client_status"]
          notes: string
          created_by: string | null
          created_at: string
          updated_at: string
          org_id: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          industry?: string
          contact_name?: string
          contact_email?: string
          status?: Database["public"]["Enums"]["client_status"]
          notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          org_id: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          industry?: string
          contact_name?: string
          contact_email?: string
          status?: Database["public"]["Enums"]["client_status"]
          notes?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          org_id?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      cost_model_tiers: {
        Row: {
          id: string
          cost_model_id: string
          min_qty: number
          max_qty: number | null
          unit_cost: number
          flat_cost: number
          created_at: string
          updated_at: string
          min_value: number
          max_value: number | null
          unit_price: number
        }
        Insert: {
          id?: string
          cost_model_id: string
          min_qty?: number
          max_qty?: number | null
          unit_cost?: number
          flat_cost?: number
          created_at?: string
          updated_at?: string
          min_value?: number
          max_value?: number | null
          unit_price?: number
        }
        Update: {
          id?: string
          cost_model_id?: string
          min_qty?: number
          max_qty?: number | null
          unit_cost?: number
          flat_cost?: number
          created_at?: string
          updated_at?: string
          min_value?: number
          max_value?: number | null
          unit_price?: number
        }
        Relationships: []
      }
      cost_models: {
        Row: {
          id: string
          org_vendor_id: string
          name: string
          pricing_model: string
          base_cost: number
          currency: string
          billing_cycle: string
          created_at: string
          updated_at: string
          org_id: string
          created_by: string | null
          updated_by: string | null
          billing_basis: Database["public"]["Enums"]["billing_basis"]
          cadence: Database["public"]["Enums"]["billing_cadence"]
        }
        Insert: {
          id?: string
          org_vendor_id: string
          name: string
          pricing_model?: string
          base_cost?: number
          currency?: string
          billing_cycle?: string
          created_at?: string
          updated_at?: string
          org_id: string
          created_by?: string | null
          updated_by?: string | null
          billing_basis?: Database["public"]["Enums"]["billing_basis"]
          cadence?: Database["public"]["Enums"]["billing_cadence"]
        }
        Update: {
          id?: string
          org_vendor_id?: string
          name?: string
          pricing_model?: string
          base_cost?: number
          currency?: string
          billing_cycle?: string
          created_at?: string
          updated_at?: string
          org_id?: string
          created_by?: string | null
          updated_by?: string | null
          billing_basis?: Database["public"]["Enums"]["billing_basis"]
          cadence?: Database["public"]["Enums"]["billing_cadence"]
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          id: string
          whop_user_id: string | null
          whop_membership_id: string | null
          status: string
          plan: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
          org_id: string
        }
        Insert: {
          id?: string
          whop_user_id?: string | null
          whop_membership_id?: string | null
          status?: string
          plan?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
          org_id: string
        }
        Update: {
          id?: string
          whop_user_id?: string | null
          whop_membership_id?: string | null
          status?: string
          plan?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
          org_id?: string
        }
        Relationships: []
      }
      labor_models: {
        Row: {
          id: string
          org_id: string
          name: string
          hourly_rate: number
          setup_hours: number
          monthly_hours: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          hourly_rate?: number
          setup_hours?: number
          monthly_hours?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          hourly_rate?: number
          setup_hours?: number
          monthly_hours?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: Database["public"]["Enums"]["org_role"]
          invited_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: Database["public"]["Enums"]["org_role"]
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          invited_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          org_id: string
          settings: Json
          created_at: string
          updated_at: string
          company_size: string | null
          primary_geographies: string[] | null
          founder_name: string | null
          founder_title: string | null
          target_verticals: string[] | null
          client_sizes: string[] | null
          buyer_personas: string[] | null
          services_offered: string[] | null
          services_custom: string[] | null
          sales_model: string | null
          delivery_models: string[] | null
          sales_team_type: string | null
          target_margin_pct: number | null
          compliance_targets: string[] | null
          additional_context: string | null
          onboarding_step: number
          onboarding_complete: boolean
          onboarding_completed_at: string | null
          bundles_generated: boolean
        }
        Insert: {
          org_id: string
          settings?: Json
          created_at?: string
          updated_at?: string
          company_size?: string | null
          primary_geographies?: string[] | null
          founder_name?: string | null
          founder_title?: string | null
          target_verticals?: string[] | null
          client_sizes?: string[] | null
          buyer_personas?: string[] | null
          services_offered?: string[] | null
          services_custom?: string[] | null
          sales_model?: string | null
          delivery_models?: string[] | null
          sales_team_type?: string | null
          target_margin_pct?: number | null
          compliance_targets?: string[] | null
          additional_context?: string | null
          onboarding_step?: number
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          bundles_generated?: boolean
        }
        Update: {
          org_id?: string
          settings?: Json
          created_at?: string
          updated_at?: string
          company_size?: string | null
          primary_geographies?: string[] | null
          founder_name?: string | null
          founder_title?: string | null
          target_verticals?: string[] | null
          client_sizes?: string[] | null
          buyer_personas?: string[] | null
          services_offered?: string[] | null
          services_custom?: string[] | null
          sales_model?: string | null
          delivery_models?: string[] | null
          sales_team_type?: string | null
          target_margin_pct?: number | null
          compliance_targets?: string[] | null
          additional_context?: string | null
          onboarding_step?: number
          onboarding_complete?: boolean
          onboarding_completed_at?: string | null
          bundles_generated?: boolean
        }
        Relationships: []
      }
      onboarding_tool_selections: {
        Row: {
          id: string
          org_id: string
          tool_name: string
          vendor_name: string | null
          category: string
          is_custom: boolean
          billing_basis: Database["public"]["Enums"]["billing_basis"] | null
          cost_amount: number | null
          sell_amount: number | null
          min_commitment: number | null
          min_units: number | null
          pricing_entered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          tool_name: string
          vendor_name?: string | null
          category: string
          is_custom?: boolean
          billing_basis?: Database["public"]["Enums"]["billing_basis"] | null
          cost_amount?: number | null
          sell_amount?: number | null
          min_commitment?: number | null
          min_units?: number | null
          pricing_entered?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          tool_name?: string
          vendor_name?: string | null
          category?: string
          is_custom?: boolean
          billing_basis?: Database["public"]["Enums"]["billing_basis"] | null
          cost_amount?: number | null
          sell_amount?: number | null
          min_commitment?: number | null
          min_units?: number | null
          pricing_entered?: boolean
          created_at?: string
        }
        Relationships: []
      }
      org_vendor_discounts: {
        Row: {
          id: string
          org_vendor_id: string
          discount_type: string
          percent_off: number | null
          flat_off: number | null
          valid_from: string | null
          valid_until: string | null
          notes: string | null
          created_at: string
          updated_at: string
          value: number | null
        }
        Insert: {
          id?: string
          org_vendor_id: string
          discount_type?: string
          percent_off?: number | null
          flat_off?: number | null
          valid_from?: string | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          id?: string
          org_vendor_id?: string
          discount_type?: string
          percent_off?: number | null
          flat_off?: number | null
          valid_from?: string | null
          valid_until?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      org_vendors: {
        Row: {
          id: string
          org_id: string
          vendor_id: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
          display_name: string
          category: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          vendor_id?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          display_name?: string
          category?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          vendor_id?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          display_name?: string
          category?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      orgs: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          role: Database["public"]["Enums"]["user_role"]
          is_active: boolean
          created_at: string
          updated_at: string
          active_org_id: string | null
        }
        Insert: {
          id: string
          display_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          active_org_id?: string | null
        }
        Update: {
          id?: string
          display_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
          active_org_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          org_id: string
          client_id: string
          bundle_version_id: string
          customer_inputs: Json
          snapshot: Json
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          client_id: string
          bundle_version_id: string
          customer_inputs: Json
          snapshot: Json
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          client_id?: string
          bundle_version_id?: string
          customer_inputs?: Json
          snapshot?: Json
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      recommendation_history: {
        Row: {
          id: string
          user_id: string | null
          client_name: string
          industry: string
          seat_count: number
          risk_tolerance: string
          compliance_requirements: Json
          recommendations: Json | null
          bundles_created: string[]
          created_at: string
          org_id: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          client_name: string
          industry: string
          seat_count: number
          risk_tolerance: string
          compliance_requirements?: Json
          recommendations?: Json | null
          bundles_created?: string[]
          created_at?: string
          org_id: string
        }
        Update: {
          id?: string
          user_id?: string | null
          client_name?: string
          industry?: string
          seat_count?: number
          risk_tolerance?: string
          compliance_requirements?: Json
          recommendations?: Json | null
          bundles_created?: string[]
          created_at?: string
          org_id?: string
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          id: string
          bundle_id: string
          name: string
          endpoints: number
          users: number
          headcount: number
          org_count: number
          contract_term_months: number
          sites: number
          sell_config: Json
          is_default: boolean
          created_at: string
          updated_at: string
          org_id: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          bundle_id: string
          name?: string
          endpoints?: number
          users?: number
          headcount?: number
          org_count?: number
          contract_term_months?: number
          sites?: number
          sell_config?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
          org_id: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          bundle_id?: string
          name?: string
          endpoints?: number
          users?: number
          headcount?: number
          org_count?: number
          contract_term_months?: number
          sites?: number
          sell_config?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
          org_id?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tools: {
        Row: {
          id: string
          name: string
          vendor: string
          category: Database["public"]["Enums"]["tool_category"]
          pricing_model: Database["public"]["Enums"]["pricing_model"]
          per_seat_cost: number | null
          flat_monthly_cost: number | null
          tier_rules: Json | null
          vendor_minimum_monthly: number | null
          labor_cost_per_seat: number | null
          support_complexity: number
          renewal_uplift_pct: number | null
          is_active: boolean
          created_at: string
          updated_at: string
          annual_flat_cost: number
          per_user_cost: number
          per_org_cost: number
          percent_discount: number
          flat_discount: number
          min_monthly_commit: number | null
          tier_metric: string
          org_id: string
          updated_by: string | null
          org_vendor_id: string | null
        }
        Insert: {
          id?: string
          name: string
          vendor: string
          category?: Database["public"]["Enums"]["tool_category"]
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          per_seat_cost?: number | null
          flat_monthly_cost?: number | null
          tier_rules?: Json | null
          vendor_minimum_monthly?: number | null
          labor_cost_per_seat?: number | null
          support_complexity?: number
          renewal_uplift_pct?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          annual_flat_cost?: number
          per_user_cost?: number
          per_org_cost?: number
          percent_discount?: number
          flat_discount?: number
          min_monthly_commit?: number | null
          tier_metric?: string
          org_id: string
          updated_by?: string | null
          org_vendor_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          vendor?: string
          category?: Database["public"]["Enums"]["tool_category"]
          pricing_model?: Database["public"]["Enums"]["pricing_model"]
          per_seat_cost?: number | null
          flat_monthly_cost?: number | null
          tier_rules?: Json | null
          vendor_minimum_monthly?: number | null
          labor_cost_per_seat?: number | null
          support_complexity?: number
          renewal_uplift_pct?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          annual_flat_cost?: number
          per_user_cost?: number
          per_org_cost?: number
          percent_discount?: number
          flat_discount?: number
          min_monthly_commit?: number | null
          tier_metric?: string
          org_id?: string
          updated_by?: string | null
          org_vendor_id?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          id: string
          name: string
          website: string | null
          logo_url: string | null
          description: string | null
          created_at: string
          category: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          name: string
          website?: string | null
          logo_url?: string | null
          description?: string | null
          created_at?: string
          category?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          name?: string
          website?: string | null
          logo_url?: string | null
          description?: string | null
          created_at?: string
          category?: string | null
          tags?: string[] | null
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          id: string
          workspace_name: string
          default_overhead_pct: number
          default_labor_pct: number
          default_target_margin_pct: number
          red_zone_margin_pct: number
          max_discount_no_approval_pct: number
          created_at: string
          updated_at: string
          onboarding_completed: boolean
          org_id: string
        }
        Insert: {
          id?: string
          workspace_name?: string
          default_overhead_pct?: number
          default_labor_pct?: number
          default_target_margin_pct?: number
          red_zone_margin_pct?: number
          max_discount_no_approval_pct?: number
          created_at?: string
          updated_at?: string
          onboarding_completed?: boolean
          org_id: string
        }
        Update: {
          id?: string
          workspace_name?: string
          default_overhead_pct?: number
          default_labor_pct?: number
          default_target_margin_pct?: number
          red_zone_margin_pct?: number
          max_discount_no_approval_pct?: number
          created_at?: string
          updated_at?: string
          onboarding_completed?: boolean
          org_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      audit_action: "tool_created" | "tool_updated" | "tool_deactivated" | "settings_updated" | "member_invited" | "member_role_changed" | "member_removed" | "bundle_created" | "bundle_updated" | "bundle_archived" | "version_created" | "client_created" | "client_updated" | "contract_created" | "contract_cancelled" | "approval_requested" | "approval_reviewed" | "recommendation_generated" | "bundle_created_from_recommendation" | "org_created" | "org_updated" | "org_member_added" | "org_member_removed" | "org_member_role_changed" | "org_switched" | "INSERT" | "UPDATE" | "DELETE"
      billing_basis: "per_user" | "per_device" | "per_domain" | "per_location" | "per_org" | "flat_monthly" | "usage" | "tiered"
      billing_cadence: "monthly" | "annual"
      bundle_status: "draft" | "active" | "archived"
      bundle_type: "ala_carte" | "tiered" | "vertical" | "custom"
      client_status: "prospect" | "active" | "churned"
      discount_type: "percent" | "fixed"
      org_role: "org_owner" | "admin" | "member" | "viewer"
      pricing_model: "per_seat" | "flat_monthly" | "tiered" | "per_user" | "per_org" | "annual_flat" | "tiered_by_metric"
      risk_tier: "low" | "medium" | "high"
      tool_category: "edr" | "siem" | "email_security" | "identity" | "backup" | "vulnerability_management" | "dns_filtering" | "mfa" | "security_awareness_training" | "documentation" | "rmm" | "psa" | "network_monitoring" | "dark_web" | "mdr" | "other"
      user_role: "owner" | "finance" | "sales" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

