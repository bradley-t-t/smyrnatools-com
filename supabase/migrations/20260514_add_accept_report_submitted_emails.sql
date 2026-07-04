-- Adds the `accept_report_submitted_emails` opt-in column to users_preferences.
-- The frontend has been writing this field via /user-preferences-service/save-all
-- but the column was never created, so every preferences upsert was failing with
-- PGRST204 ("Could not find the column ... in the schema cache").
--
-- Defaults to false — report-submitted emails are strictly opt-in. Existing rows
-- get false on backfill so nobody is auto-subscribed; users flip it on themselves
-- from the preferences UI.

alter table public.users_preferences
    add column if not exists accept_report_submitted_emails boolean not null default false;

-- Force PostgREST to refresh its schema cache so the new column is queryable
-- immediately without waiting for the next auto-reload cycle.
notify pgrst, 'reload schema';
