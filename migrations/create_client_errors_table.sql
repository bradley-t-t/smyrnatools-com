-- Client-side error tracking table
-- Run this in Supabase SQL Editor to enable production error monitoring

CREATE TABLE IF NOT EXISTS client_errors (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    level TEXT NOT NULL DEFAULT 'error',
    message TEXT NOT NULL,
    url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for querying recent errors efficiently
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_level ON client_errors (level);

-- Auto-cleanup: delete errors older than 30 days (run via pg_cron or scheduled function)
-- SELECT cron.schedule('cleanup-client-errors', '0 3 * * *', $$DELETE FROM client_errors WHERE created_at < now() - interval '30 days'$$);

-- RLS: allow authenticated users to insert their own errors
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own errors"
    ON client_errors FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can insert anonymous errors"
    ON client_errors FOR INSERT
    TO anon
    WITH CHECK (true);

-- Only allow reading for service role (admin/backend queries)
CREATE POLICY "Service role can read all errors"
    ON client_errors FOR SELECT
    TO service_role
    USING (true);

-- Also allow authenticated users to read (for admin dashboard)
CREATE POLICY "Authenticated users can read errors"
    ON client_errors FOR SELECT
    TO authenticated
    USING (true);
