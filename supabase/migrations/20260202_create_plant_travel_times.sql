DROP POLICY IF EXISTS "Allow authenticated read" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow authenticated insert" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow authenticated update" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow authenticated delete" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow all read" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow all insert" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow all update" ON plant_travel_times;
DROP POLICY IF EXISTS "Allow all delete" ON plant_travel_times;

CREATE TABLE IF NOT EXISTS plant_travel_times (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_plant_code TEXT NOT NULL,
    to_plant_code TEXT NOT NULL,
    travel_minutes INTEGER NOT NULL CHECK (travel_minutes > 0 AND travel_minutes <= 180),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_plant_code, to_plant_code)
);

CREATE INDEX IF NOT EXISTS idx_plant_travel_times_from ON plant_travel_times(from_plant_code);
CREATE INDEX IF NOT EXISTS idx_plant_travel_times_to ON plant_travel_times(to_plant_code);

ALTER TABLE plant_travel_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read" ON plant_travel_times FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON plant_travel_times FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON plant_travel_times FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete" ON plant_travel_times FOR DELETE USING (true);
