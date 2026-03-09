ALTER TABLE users_profiles
ADD COLUMN IF NOT EXISTS additional_assigned_plants text[] DEFAULT NULL;
