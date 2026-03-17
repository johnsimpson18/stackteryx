-- Add missing tool_category enum values for global library categories
-- that previously fell through to 'other'.

ALTER TYPE tool_category ADD VALUE IF NOT EXISTS 'dark_web';
ALTER TYPE tool_category ADD VALUE IF NOT EXISTS 'mdr';

-- Fix any tools already added from the global library that were stored as 'other'
-- but should be 'dark_web' (Flare, SpyCloud, ID Agent).
-- Cannot do this inline because ADD VALUE requires a committed transaction.
-- Run as a follow-up:
--   UPDATE tools SET category = 'dark_web'
--     WHERE category = 'other'
--     AND name IN ('Flare Threat Exposure', 'SpyCloud Employee ATO Prevention', 'ID Agent Dark Web Monitoring');
--   UPDATE tools SET category = 'mdr'
--     WHERE category = 'edr'
--     AND name IN ('Arctic Wolf MDR', 'Secureworks Taegis MDR', 'Red Canary MDR',
--                  'Blackpoint Cyber MDR', 'Coro MDR', 'Expel MDR');
