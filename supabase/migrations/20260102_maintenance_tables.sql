CREATE TABLE IF NOT EXISTS maintenance_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50) NOT NULL,
    frequency_value INT DEFAULT 1,
    created_by UUID NOT NULL,
    assigned_roles UUID[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    region_code VARCHAR(50),
    plant_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES maintenance_forms(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT false,
    field_order INT DEFAULT 0,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES maintenance_forms(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL,
    due_date DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'submitted',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_submission_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES maintenance_submissions(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES maintenance_form_fields(id) ON DELETE CASCADE,
    response_value TEXT,
    checklist_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_due_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES maintenance_forms(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    assigned_user_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    submission_id UUID REFERENCES maintenance_submissions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(form_id, due_date, assigned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_forms_created_by ON maintenance_forms(created_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_forms_region ON maintenance_forms(region_code);
CREATE INDEX IF NOT EXISTS idx_maintenance_forms_plant ON maintenance_forms(plant_code);
CREATE INDEX IF NOT EXISTS idx_maintenance_form_fields_form_id ON maintenance_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_submissions_form_id ON maintenance_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_submissions_submitted_by ON maintenance_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_submissions_status ON maintenance_submissions(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_items_form_id ON maintenance_due_items(form_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_items_assigned_user ON maintenance_due_items(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_items_due_date ON maintenance_due_items(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_due_items_status ON maintenance_due_items(status);

ALTER TABLE maintenance_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_submission_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_due_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to maintenance_forms" ON maintenance_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to maintenance_form_fields" ON maintenance_form_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to maintenance_submissions" ON maintenance_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to maintenance_submission_responses" ON maintenance_submission_responses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to maintenance_due_items" ON maintenance_due_items FOR ALL USING (true) WITH CHECK (true);
