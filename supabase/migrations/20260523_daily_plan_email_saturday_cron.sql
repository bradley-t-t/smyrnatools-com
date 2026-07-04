-- Daily Plan email — Saturday 11 AM cron.
--
-- The plant doesn't operate Sundays, so the Friday-evening 4 PM cron has
-- nothing useful to ship to plant managers on Saturday morning (Sunday's
-- plan would just be empty). Instead, on Saturday the cron fires at 11 AM
-- Chicago and the edge function targets Monday's plan via
-- `chicagoNextWorkingDate(now)`.
--
-- pg_cron runs in UTC and the trigger function is shared; the edge function
-- self-checks the Chicago wall clock against the expected per-day hour
-- (16 weekdays / 11 Saturday) and treats off-day or off-hour firings as
-- cheap no-ops. So we just add the Saturday entries on top of the existing
-- 4 PM ones — duplicate triggers on the off-day are harmless.
--
-- DST mapping for 11 AM Chicago:
--   • 16:00 UTC = 11:00 CDT  (March–November)
--   • 17:00 UTC = 11:00 CST  (November–March)

do $$
declare
    existing record;
begin
    for existing in
        select jobid from cron.job where jobname in ('daily-plan-email-sat-cdt', 'daily-plan-email-sat-cst')
    loop
        perform cron.unschedule(existing.jobid);
    end loop;
end $$;

select cron.schedule(
    'daily-plan-email-sat-cdt',
    '0 16 * * 6',
    $$select public.trigger_daily_plan_email()$$
);
select cron.schedule(
    'daily-plan-email-sat-cst',
    '0 17 * * 6',
    $$select public.trigger_daily_plan_email()$$
);

notify pgrst, 'reload schema';
