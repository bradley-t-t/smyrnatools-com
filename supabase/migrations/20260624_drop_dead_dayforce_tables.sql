-- Drop the dead Dayforce tables.
--
-- These three tables were created in 20260523_dayforce_data.sql as part of the
-- original Dayforce sync schema, alongside dayforce_shifts. They were populated
-- by the dayforce-import edge function (fed by the dayforce-sync.user.js
-- Tampermonkey bridge) but were NEVER read anywhere in src/ — only
-- dayforce_shifts is consumed by the live operator-clock-status pipeline
-- (OperatorClockStatusService → OperatorClockStatusContext → OperatorClockIndicator).
--
-- The three tables below are write-only sinks with no downstream reader, so the
-- bridge userscript and the edge function have been trimmed to stop populating
-- them. This migration finishes the cleanup by removing the tables themselves.
--
-- dayforce_shifts is INTENTIONALLY NOT TOUCHED — it backs the live clock-status
-- feature and is still written by the trimmed edge function.
--
-- CASCADE additionally removes the per-table updated_at triggers, RLS policies,
-- and indexes (all auto-owned by the table). The shared touch_dayforce_updated_at
-- function is kept because dayforce_shifts still uses it.

DROP TABLE IF EXISTS public.dayforce_raw_punches CASCADE;
DROP TABLE IF EXISTS public.dayforce_employees CASCADE;
DROP TABLE IF EXISTS public.dayforce_org_units CASCADE;
