-- Shared plans table: one plan per date, editable by anyone with plan.edit permission
CREATE TABLE IF NOT EXISTS plans (
    plan_date DATE PRIMARY KEY,
    assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable realtime on the plans table so changes broadcast to all connected clients
ALTER PUBLICATION supabase_realtime ADD TABLE plans;

-- Optional: migrate existing per-user plans to the shared table.
-- Takes the most recently updated plan per date.
-- Run once after creating the table.

-- INSERT INTO plans (plan_date, assignments, notes, updated_at)
-- SELECT DISTINCT ON (plan_date) plan_date, assignments, notes, updated_at
-- FROM users_plans
-- ORDER BY plan_date, updated_at DESC
-- ON CONFLICT DO NOTHING;
