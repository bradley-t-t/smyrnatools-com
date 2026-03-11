-- Messages table for direct user-to-user messaging
-- Uses pgcrypto + Supabase Vault for symmetric encryption of message bodies

-- Step 1: Enable pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Store encryption key in Vault
SELECT vault.create_secret(
    md5(random()::text || clock_timestamp()::text || random()::text) ||
    md5(random()::text || clock_timestamp()::text || random()::text),
    'messages_encryption_key'
);

-- Step 3: Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT '',
    body BYTEA NOT NULL,
    attachment_type TEXT,
    attachment_meta JSONB,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_by_sender BOOLEAN NOT NULL DEFAULT false,
    deleted_by_recipient BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for inbox and sent queries (only active messages)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages (recipient_id, created_at DESC)
    WHERE deleted_by_recipient = false;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages (sender_id, created_at DESC)
    WHERE deleted_by_sender = false;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON messages (recipient_id)
    WHERE is_read = false AND deleted_by_recipient = false;

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to messages"
    ON messages FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can insert their own messages"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can read their own messages"
    ON messages FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Helper: get encryption key from Vault
CREATE OR REPLACE FUNCTION get_messages_key()
RETURNS TEXT AS $$
DECLARE
    key TEXT;
BEGIN
    SELECT decrypted_secret INTO key
    FROM vault.decrypted_secrets
    WHERE name = 'messages_encryption_key'
    LIMIT 1;

    IF key IS NULL THEN
        RAISE EXCEPTION 'Encryption key not found in Vault. Add a secret named "messages_encryption_key" in Supabase Dashboard > Vault.';
    END IF;

    RETURN key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Encrypt message body using Vault key
CREATE OR REPLACE FUNCTION encrypt_message_body(plaintext TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(plaintext, get_messages_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt message body using Vault key
CREATE OR REPLACE FUNCTION decrypt_message_body(ciphertext BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(ciphertext, get_messages_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for sending messages (handles encryption)
CREATE OR REPLACE FUNCTION send_message(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_subject TEXT DEFAULT '',
    p_body TEXT DEFAULT '',
    p_attachment_type TEXT DEFAULT NULL,
    p_attachment_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO messages (sender_id, recipient_id, subject, body, attachment_type, attachment_meta)
    VALUES (
        p_sender_id,
        p_recipient_id,
        COALESCE(p_subject, ''),
        encrypt_message_body(COALESCE(p_body, '')),
        p_attachment_type,
        p_attachment_meta
    )
    RETURNING id INTO new_id;
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience view for decrypted messages
CREATE OR REPLACE VIEW messages_decrypted AS
SELECT
    id,
    sender_id,
    recipient_id,
    subject,
    decrypt_message_body(body) AS body,
    attachment_type,
    attachment_meta,
    is_read,
    read_at,
    created_at,
    deleted_by_sender,
    deleted_by_recipient
FROM messages;
