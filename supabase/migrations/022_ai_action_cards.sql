-- Migration 022: ai_action_cards table
-- Stores persistent Dashboard AI action cards.
-- Cards can be dismissed, snoozed, and auto-expire.

CREATE TABLE IF NOT EXISTS ai_action_cards (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  card_type      text        NOT NULL,
  severity       text        NOT NULL DEFAULT 'info',
  title          text        NOT NULL,
  body           text,
  cta_label      text,
  cta_href       text,
  entity_type    text,
  entity_id      uuid,
  dismissed_at   timestamptz,
  snoozed_until  timestamptz,
  created_at     timestamptz DEFAULT now(),
  expires_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_action_cards_org
  ON ai_action_cards(org_id);

CREATE INDEX IF NOT EXISTS idx_ai_action_cards_active
  ON ai_action_cards(org_id, card_type)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ai_action_cards_entity
  ON ai_action_cards(entity_type, entity_id);

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE ai_action_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aiac_select" ON ai_action_cards FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "aiac_insert" ON ai_action_cards FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "aiac_update" ON ai_action_cards FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids()))
  WITH CHECK (org_id IN (SELECT get_user_org_ids()));

CREATE POLICY "aiac_delete" ON ai_action_cards FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids()));
