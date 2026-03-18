# Security: Credential Rotation Required

The following secrets in `.env` should be rotated as soon as possible, as they have been committed to the repository:

- `REACT_APP_SUPABASE_ANON_KEY` — Regenerate in the database dashboard
- `MAILERSEND_API_TOKEN` — Regenerate in the MailerSend dashboard
- `GROK_API_KEY` — Regenerate in the xAI dashboard

After rotating, update `.env` (and any deployment environment variables) with the new values. Ensure `.env` is listed in `.gitignore` to prevent future exposure.
