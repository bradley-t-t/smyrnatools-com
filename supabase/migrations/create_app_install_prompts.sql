CREATE TABLE IF NOT EXISTS app_install_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prompt_type TEXT NOT NULL CHECK (prompt_type IN ('mobile_install', 'desktop_tutorial')),
    action TEXT NOT NULL CHECK (action IN ('dismissed_forever', 'remind_later', 'installed')),
    device_type TEXT CHECK (device_type IN ('ios', 'android', 'desktop')),
    reminded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, prompt_type)
);

CREATE INDEX idx_app_install_prompts_user_id ON app_install_prompts(user_id);
CREATE INDEX idx_app_install_prompts_action ON app_install_prompts(action);
CREATE INDEX idx_app_install_prompts_reminded_at ON app_install_prompts(reminded_at);
