-- Permanently disable the Daily Plan email cron.
--
-- Earlier migrations (20260519_daily_plan_email_cron.sql,
-- 20260523_daily_plan_email_saturday_cron.sql) scheduled four pg_cron entries
-- that fire `public.trigger_daily_plan_email()` and POST to the
-- `daily-plan-email/cron-send` edge function. We're shutting the email off
-- for good, so unschedule all four jobs idempotently. A future db reset that
-- re-applies the older migrations will re-create the jobs in their pass and
-- this migration will then drop them again on its own pass — leaving the
-- final database state job-free regardless of replay order.
--
-- The trigger function (`public.trigger_daily_plan_email`) and the config
-- table (`public.daily_plan_email_config`) are intentionally left in place
-- so they can be re-scheduled by a future migration without recreating the
-- supporting plumbing.

do $$
declare
    existing record;
begin
    for existing in
        select jobid from cron.job where jobname in (
            'daily-plan-email-cdt',
            'daily-plan-email-cst',
            'daily-plan-email-sat-cdt',
            'daily-plan-email-sat-cst'
        )
    loop
        perform cron.unschedule(existing.jobid);
    end loop;
end $$;

notify pgrst, 'reload schema';
