CREATE TABLE IF NOT EXISTS report_operator_exclusion_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('plant_shutdown', 'operators_sent_to_other_location')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id)
);

CREATE INDEX IF NOT EXISTS idx_report_operator_exclusion_reasons_report
    ON report_operator_exclusion_reasons(report_id);

ALTER TABLE report_operator_exclusion_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to report_operator_exclusion_reasons"
    ON report_operator_exclusion_reasons
    FOR ALL
    USING (true)
    WITH CHECK (true);
