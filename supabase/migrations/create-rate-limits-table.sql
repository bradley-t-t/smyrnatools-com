-- Create rate_limits table for persistent rate limiting across edge function instances
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON rate_limits (key, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits (expires_at);
