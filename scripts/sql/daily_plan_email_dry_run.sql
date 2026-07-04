-- Daily Plan email — dry-run via the cron-send endpoint.
--
-- `dryRun: true` short-circuits the actual email-service call but still
-- returns the full resolved payload (intended TO + CC + subject) per plant
-- so we can verify routing without sending anything.
--
-- `force: true` bypasses the 4 PM Chicago hour gate and the Sunday skip,
-- so this can run at any hour on any day. `planDate` defaults to tomorrow
-- in Chicago wall-clock if omitted — pass an explicit YYYY-MM-DD to dry-
-- run a different day's plan.
--
-- Two steps:
--   STEP 1  fire the request and remember the request_id
--   STEP 2  read the response body once Postgres has stored it
-- Postgres returns the request_id synchronously, but the response arrives
-- asynchronously through pg_net — wait a couple seconds before running
-- STEP 2.

-- =========================================================================
-- STEP 1 — fire the dry-run. Returns a request_id (bigint).
-- =========================================================================
with cfg as (
    select edge_url, edge_internal_token
        from public.daily_plan_email_config
        where id = 1
        limit 1
)
select net.http_post(
    url := cfg.edge_url || '/daily-plan-email/cron-send',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Internal-Token', cfg.edge_internal_token
    ),
    body := jsonb_build_object(
        'source', 'sql-dry-run',
        'dryRun', true,
        'force', true
        -- ,'planDate', '2026-05-20'   -- uncomment + edit to target a specific date
    )
) as request_id
from cfg;

-- =========================================================================
-- STEP 2 — read the response. Replace <REQUEST_ID> with the bigint above.
-- =========================================================================
-- select id, status_code, content_type, content
--     from net._http_response
--     where id = <REQUEST_ID>;
