-- Enables Postgres logical replication for the `plans` table so the Planner
-- tab's `useRealtimeSubscription` hook starts receiving change events.
--
-- Without this, every browser viewing the same plan_date is in its own bubble:
-- the React subscription is established but no rows ever stream through, so
-- one dispatcher's edits never reach another. After this runs, INSERT /
-- UPDATE / DELETE on `plans` will fan out to every subscribed client live.
--
-- REPLICA IDENTITY FULL is required so DELETE events carry the OLD row that
-- clients filter on (plan_date) — the default identity (primary key only)
-- would leave clients unable to tell which row was removed.

alter table public.plans replica identity full;

-- Idempotent membership check: add the table to the realtime publication only
-- if it isn't already there. Re-running this migration in environments where
-- somebody added it through the Studio UI is then a no-op instead of an error.
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'plans'
    ) then
        execute 'alter publication supabase_realtime add table public.plans';
    end if;
end $$;

notify pgrst, 'reload schema';
