-- When the organizer sent this guest their invitation (via the guided WhatsApp flow or the
-- per-guest WhatsApp button). NULL = not sent yet.
ALTER TABLE guests ADD COLUMN invite_sent_at timestamptz;
