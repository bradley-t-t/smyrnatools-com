CREATE TABLE IF NOT EXISTS user_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_date DATE NOT NULL,
    assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    generated_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);

CREATE INDEX idx_user_plans_user_id ON user_plans(user_id);
CREATE INDEX idx_user_plans_plan_date ON user_plans(plan_date);
CREATE INDEX idx_user_plans_user_date ON user_plans(user_id, plan_date);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to user_plans" ON user_plans
    FOR ALL
    USING (true)
    WITH CHECK (true);
