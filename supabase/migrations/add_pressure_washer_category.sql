INSERT INTO maintenance_log_categories (name, is_active)
VALUES ('Pressure Washer', true)
ON CONFLICT (name) DO NOTHING;
