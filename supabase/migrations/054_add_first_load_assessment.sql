-- Track whether the first-load practice assessment has been shown
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS first_load_assessment_shown_at timestamptz;
