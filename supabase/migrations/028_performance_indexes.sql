-- Performance indexes on FK columns used in WHERE clauses and JOINs

-- bundle_versions
CREATE INDEX IF NOT EXISTS idx_bundle_versions_bundle_id ON bundle_versions(bundle_id);

-- client_contracts
CREATE INDEX IF NOT EXISTS idx_client_contracts_client_id ON client_contracts(client_id);

-- bundle_version_tools
CREATE INDEX IF NOT EXISTS idx_bundle_version_tools_tool_id ON bundle_version_tools(tool_id);
CREATE INDEX IF NOT EXISTS idx_bundle_version_tools_version_id ON bundle_version_tools(bundle_version_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_active_org_id ON profiles(active_org_id);

-- approvals
CREATE INDEX IF NOT EXISTS idx_approvals_bundle_id ON approvals(bundle_id);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_by ON approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_approvals_reviewed_by ON approvals(reviewed_by);

-- action_cards
CREATE INDEX IF NOT EXISTS idx_action_cards_org_id ON action_cards(org_id);
CREATE INDEX IF NOT EXISTS idx_action_cards_dismissed ON action_cards(dismissed) WHERE dismissed = false;
