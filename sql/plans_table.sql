-- Shared plans table: one plan per date, editable by anyone with plan.edit permission
CREATE TABLE IF NOT EXISTS plans (
    plan_date DATE PRIMARY KEY,
    assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migrate existing data from users_plans if desired (takes the most recent per date)
-- INSERT INTO plans (plan_date, assignments, notes, updated_at)
-- SELECT DISTINCT ON (plan_date) plan_date, assignments, notes, updated_at
-- FROM users_plans
-- ORDER BY plan_date, updated_at DESC
-- ON CONFLICT DO NOTHING;
