-- Create list_planned_items table for shared weekly planning
-- This table stores which list items are planned for which days
-- All users share the same plan

CREATE TABLE IF NOT EXISTS list_planned_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_item_id UUID NOT NULL REFERENCES list_items(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    UNIQUE(list_item_id, planned_date)
);

-- Index for efficient lookups by date range
CREATE INDEX IF NOT EXISTS idx_list_planned_items_date ON list_planned_items(planned_date);

-- Index for efficient lookups by list item
CREATE INDEX IF NOT EXISTS idx_list_planned_items_list_item ON list_planned_items(list_item_id);

-- Disable RLS completely for this table
ALTER TABLE list_planned_items DISABLE ROW LEVEL SECURITY;
