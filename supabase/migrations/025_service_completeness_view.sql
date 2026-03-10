-- Migration 025: service_completeness computed view
-- Scores each service (bundle) across all five layers.
-- Feeds the Dashboard Portfolio Health grid and the AI action card engine.

CREATE OR REPLACE VIEW service_completeness AS
SELECT
  b.id                AS bundle_id,
  b.org_id,
  b.name              AS service_name,

  -- Layer 1: Outcome — service_outcomes record exists with non-null outcome_statement
  EXISTS (
    SELECT 1 FROM service_outcomes so
    WHERE so.bundle_id = b.id
      AND so.outcome_statement IS NOT NULL
  ) AS outcome_complete,

  -- Layer 2: Service — service_capabilities jsonb has at least one entry
  EXISTS (
    SELECT 1 FROM service_outcomes so
    WHERE so.bundle_id = b.id
      AND so.service_capabilities IS NOT NULL
      AND jsonb_array_length(so.service_capabilities) > 0
  ) AS service_complete,

  -- Layer 3: Stack — at least one tool is assigned via bundle_version_tools
  EXISTS (
    SELECT 1 FROM bundle_versions bv
    JOIN bundle_version_tools bvt ON bvt.bundle_version_id = bv.id
    WHERE bv.bundle_id = b.id
  ) AS stack_complete,

  -- Layer 4: Economics — at least one bundle_version exists with pricing data
  EXISTS (
    SELECT 1 FROM bundle_versions bv
    WHERE bv.bundle_id = b.id
      AND bv.computed_mrr IS NOT NULL
  ) AS economics_complete,

  -- Layer 5: Enablement — bundle_enablement record exists with non-null content
  EXISTS (
    SELECT 1 FROM bundle_enablement be
    JOIN bundle_versions bv ON bv.id = be.bundle_version_id
    WHERE bv.bundle_id = b.id
      AND (be.service_overview IS NOT NULL OR be.talking_points IS NOT NULL)
  ) AS enablement_complete,

  -- Aggregate: count of complete layers (0–5)
  (
    (EXISTS (SELECT 1 FROM service_outcomes so WHERE so.bundle_id = b.id AND so.outcome_statement IS NOT NULL))::int +
    (EXISTS (SELECT 1 FROM service_outcomes so WHERE so.bundle_id = b.id AND so.service_capabilities IS NOT NULL AND jsonb_array_length(so.service_capabilities) > 0))::int +
    (EXISTS (SELECT 1 FROM bundle_versions bv JOIN bundle_version_tools bvt ON bvt.bundle_version_id = bv.id WHERE bv.bundle_id = b.id))::int +
    (EXISTS (SELECT 1 FROM bundle_versions bv WHERE bv.bundle_id = b.id AND bv.computed_mrr IS NOT NULL))::int +
    (EXISTS (SELECT 1 FROM bundle_enablement be JOIN bundle_versions bv ON bv.id = be.bundle_version_id WHERE bv.bundle_id = b.id AND (be.service_overview IS NOT NULL OR be.talking_points IS NOT NULL)))::int
  ) AS layers_complete,

  -- Aggregate: percentage (0–100)
  (
    (EXISTS (SELECT 1 FROM service_outcomes so WHERE so.bundle_id = b.id AND so.outcome_statement IS NOT NULL))::int +
    (EXISTS (SELECT 1 FROM service_outcomes so WHERE so.bundle_id = b.id AND so.service_capabilities IS NOT NULL AND jsonb_array_length(so.service_capabilities) > 0))::int +
    (EXISTS (SELECT 1 FROM bundle_versions bv JOIN bundle_version_tools bvt ON bvt.bundle_version_id = bv.id WHERE bv.bundle_id = b.id))::int +
    (EXISTS (SELECT 1 FROM bundle_versions bv WHERE bv.bundle_id = b.id AND bv.computed_mrr IS NOT NULL))::int +
    (EXISTS (SELECT 1 FROM bundle_enablement be JOIN bundle_versions bv ON bv.id = be.bundle_version_id WHERE bv.bundle_id = b.id AND (be.service_overview IS NOT NULL OR be.talking_points IS NOT NULL)))::int
  )::numeric / 5 * 100 AS completeness_pct

FROM bundles b;
