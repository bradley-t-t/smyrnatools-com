-- plan_schedule_snapshots: one row per `schedule_date`, capturing what the
-- daily order list looked like at 5:30 PM Central the evening before. The
-- Schedule tab diffs the live data against this snapshot to show moves,
-- spacing changes, address changes, and added/removed orders.
--
-- The full per-plant production blob is stored as JSONB so the diff engine
-- can compare every field of every order without a normalized schema —
-- order shapes do drift across dispatch report versions and a flat JSONB
-- column keeps the snapshot resilient to that.
--
-- Snapshots are kept FOREVER (no retention) so the team can answer "where
-- did this 6-month-old order start and end" without scrub through git.

create table if not exists public.plan_schedule_snapshots (
    id uuid primary key default gen_random_uuid(),
    schedule_date date not null unique,
    captured_at timestamptz not null default now(),
    captured_by text not null default 'cron',
    plant_production jsonb not null default '{}'::jsonb,
    order_count integer not null default 0,
    total_yardage numeric not null default 0
);

create index if not exists plan_schedule_snapshots_date_idx
    on public.plan_schedule_snapshots (schedule_date desc);

-- pg_cron + pg_net so Postgres can fire the edge function on a schedule.
-- Both extensions are available on every Supabase project; the `create
-- extension if not exists` is a no-op when already enabled.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Wrapper SQL function the cron entry calls — keeps the schedule expression
-- small and centralizes the URL / token lookup in one place. The token is
-- the same `EDGE_INTERNAL_TOKEN` the existing internalAuth helper checks,
-- and is expected to be set via:
--   alter database postgres set app.settings.edge_internal_token = '<token>';
--   alter database postgres set app.settings.edge_url = 'https://<project-ref>.supabase.co/functions/v1';
-- Both settings are read with `current_setting(..., true)` so a missing
-- entry returns NULL and the function logs + exits instead of erroring.
create or replace function public.trigger_schedule_snapshot()
returns void
language plpgsql
security definer
as $$
declare
    base_url text := current_setting('app.settings.edge_url', true);
    internal_token text := current_setting('app.settings.edge_internal_token', true);
    function_url text;
begin
    if base_url is null or base_url = '' then
        raise notice 'app.settings.edge_url not configured; schedule snapshot cron skipped';
        return;
    end if;
    if internal_token is null or internal_token = '' then
        raise notice 'app.settings.edge_internal_token not configured; schedule snapshot cron skipped';
        return;
    end if;
    function_url := base_url || '/schedule-snapshot-service/capture';
    perform net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Internal-Token', internal_token
        ),
        body := jsonb_build_object('source', 'pg_cron')
    );
end;
$$;

-- Two cron entries so the snapshot lands at exactly 5:30 PM Chicago time
-- regardless of DST. pg_cron runs in UTC:
--   - 22:30 UTC = 17:30 CDT (March–November)
--   - 23:30 UTC = 17:30 CST (November–March)
-- The edge function self-checks the Chicago wall clock and exits early if
-- it's not in the 17:30 hour, AND the `schedule_date` unique constraint
-- means the off-hour call is a cheap no-op even if both fire on the same
-- day (which they won't, since only one matches Chicago's 5:30 PM at a time).
do $$
declare
    existing record;
begin
    for existing in
        select jobid from cron.job where jobname in ('schedule-snapshot-cdt', 'schedule-snapshot-cst')
    loop
        perform cron.unschedule(existing.jobid);
    end loop;
end $$;

select cron.schedule(
    'schedule-snapshot-cdt',
    '30 22 * * *',
    $$select public.trigger_schedule_snapshot()$$
);
select cron.schedule(
    'schedule-snapshot-cst',
    '30 23 * * *',
    $$select public.trigger_schedule_snapshot()$$
);

notify pgrst, 'reload schema';
