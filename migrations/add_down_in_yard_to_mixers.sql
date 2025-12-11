ALTER TABLE mixers ADD COLUMN IF NOT EXISTS down_in_yard BOOLEAN DEFAULT false;

COMMENT ON COLUMN mixers.down_in_yard IS 'Indicates if the mixer is down in the yard while in shop status';
