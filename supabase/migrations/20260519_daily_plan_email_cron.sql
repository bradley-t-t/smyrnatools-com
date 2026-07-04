-- Daily Plan email cron: fires the `daily-plan-email/cron-send` endpoint at
-- 4:00 PM Chicago every day. The edge function self-checks the Chicago
-- wall clock so the duplicate UTC entries (CDT vs CST) only do work in the
-- correct half of the year — the off-hour run is a cheap no-op.
--
-- Tokens & URLs live in a tiny single-row config table (`daily_plan_email_config`)
-- so the cron trigger function can read them inline without depending on
-- session settings (pg_cron workers don't share session state). The
-- service-role-only RLS policy keeps the internal token out of the anon
-- REST API surface.

create table if not exists public.daily_plan_email_config (
    id smallint primary key default 1 check (id = 1),
    edge_url text not null,
    edge_internal_token text not null,
    updated_at timestamptz not null default now()
);

alter table public.daily_plan_email_config enable row level security;

drop policy if exists "service role only" on public.daily_plan_email_config;
create policy "service role only" on public.daily_plan_email_config
    for all
    using (false)
    with check (false);

-- pg_cron + pg_net so Postgres can fire the edge function on a schedule.
-- `create extension if not exists` is a no-op when already enabled by an
-- earlier migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_daily_plan_email()
returns void
language plpgsql
security definer
as $$
declare
    cfg record;
    function_url text;
begin
    select edge_url, edge_internal_token
        into cfg
        from public.daily_plan_email_config
        where id = 1
        limit 1;
    if cfg is null or cfg.edge_url is null or cfg.edge_url = '' or cfg.edge_internal_token = '' then
        raise notice 'daily_plan_email_config not populated; cron skipped';
        return;
    end if;
    function_url := cfg.edge_url || '/daily-plan-email/cron-send';
    perform net.http_post(
        url := function_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'X-Internal-Token', cfg.edge_internal_token
        ),
        body := jsonb_build_object('source', 'pg_cron')
    );
end;
$$;

-- Two cron entries so the email round lands at exactly 4:00 PM Chicago
-- regardless of DST. pg_cron runs in UTC:
--   - 21:00 UTC = 16:00 CDT (March–November)
--   - 22:00 UTC = 16:00 CST (November–March)
-- The edge function self-checks the Chicago wall clock and exits early if
-- it's not in the 16:00 hour, so the off-season call is a free no-op.
do $$
declare
    existing record;
begin
    for existing in
        select jobid from cron.job where jobname in ('daily-plan-email-cdt', 'daily-plan-email-cst')
    loop
        perform cron.unschedule(existing.jobid);
    end loop;
end $$;

select cron.schedule(
    'daily-plan-email-cdt',
    '0 21 * * *',
    $$select public.trigger_daily_plan_email()$$
);
select cron.schedule(
    'daily-plan-email-cst',
    '0 22 * * *',
    $$select public.trigger_daily_plan_email()$$
);

notify pgrst, 'reload schema';
