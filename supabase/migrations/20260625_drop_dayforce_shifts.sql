-- Drop dayforce_shifts and the shared trigger function.
--
-- dayforce_shifts was the sole surviving Dayforce table, kept only to back
-- the operator-clock-status feature (OperatorClockStatusService →
-- OperatorClockStatusContext → OperatorClockIndicator). That feature has been
-- removed from the codebase, so the table now has no reader and its producers
-- (the dayforce-import edge function + dayforce-sync.user.js bridge) have been
-- deleted. The other three Dayforce tables were already dropped in
-- 20260624_drop_dead_dayforce_tables.sql.
--
-- CASCADE removes the table's updated_at trigger, RLS policy, and indexes.
-- touch_dayforce_updated_at() is now used by NO table (the other three are
-- already gone and this drops the last one), so it is dropped too.
--
-- Apply manually (psql / Supabase SQL editor / CLI) — the daemon never runs DDL.

DROP TABLE IF EXISTS public.dayforce_shifts CASCADE;
DROP FUNCTION IF EXISTS touch_dayforce_updated_at() CASCADE;
