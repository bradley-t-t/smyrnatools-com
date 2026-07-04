-- Runtime config for the schedule snapshot pg_cron job. Stored in a tiny
-- single-row config table (rather than `ALTER DATABASE ... SET ...`)
-- because `current_setting` only sees session-level settings, which the
-- pg_cron worker doesn't share — and the vault flow is overkill for two
-- values. The trigger function reads from this table inline.

create table if not exists public.plan_schedule_snapshot_config (
    id smallint primary key default 1 check (id = 1),
    edge_url text not null,
    edge_internal_token text not null,
    updated_at timestamptz not null default now()
);

-- Lock the table behind service-role only so the token never leaks via
-- the anon REST API.
alter table public.plan_schedule_snapshot_config enable row level security;

drop policy if exists "service role only" on public.plan_schedule_snapshot_config;
create policy "service role only" on public.plan_schedule_snapshot_config
    for all
    using (false)
    with check (false);

-- Re-target the cron's trigger function at the new config table.
create or replace function public.trigger_schedule_snapshot()
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
        from public.plan_schedule_snapshot_config
        where id = 1
        limit 1;
    if cfg is null or cfg.edge_url is null or cfg.edge_url = '' or cfg.edge_internal_token = '' then
        raise notice 'plan_schedule_snapshot_config not populated; cron skipped';
        return;
    end if;
    function_url := cfg.edge_url || '/schedule-snapshot-service/capture';
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

notify pgrst, 'reload schema';
