ALTER TABLE users_preferences
ADD COLUMN IF NOT EXISTS accept_comment_emails boolean DEFAULT true;
