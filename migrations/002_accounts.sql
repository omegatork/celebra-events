-- 002_accounts: organizer accounts, server-side sessions, invitation passwords, login throttling

CREATE TABLE accounts (
  id          text PRIMARY KEY,
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id             text PRIMARY KEY,
  email          text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  name           text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  account_id  text NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, user_id)
);
CREATE INDEX memberships_user_id_idx ON memberships(user_id);

-- account_id NULL = not owned by any account (managed by platform admin and/or invitation password)
ALTER TABLE events
  ADD COLUMN account_id text REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN invitation_password_hash text;
CREATE INDEX events_account_id_idx ON events(account_id);

-- Server-side sessions: the cookie holds a random token, the DB stores only its SHA-256.
CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  kind        text NOT NULL CHECK (kind IN ('user', 'invitation', 'admin')),
  user_id     text REFERENCES users(id) ON DELETE CASCADE,
  event_id    text REFERENCES events(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'user') = (user_id IS NOT NULL)),
  CHECK ((kind = 'invitation') = (event_id IS NOT NULL))
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_event_id_idx ON sessions(event_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

-- Failed login / signup attempts for throttling.
CREATE TABLE auth_attempts (
  key  text NOT NULL,
  at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_key_at_idx ON auth_attempts(key, at);
