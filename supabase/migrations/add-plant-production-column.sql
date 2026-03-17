-- Add plant_production JSONB column to plans table
-- Stores per-plant first job time, last job time, and total yardage
ALTER TABLE plans ADD COLUMN IF NOT EXISTS plant_production JSONB DEFAULT '{}'::jsonb;
