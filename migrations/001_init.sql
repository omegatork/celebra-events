-- 001_init: events (invitation document as JSONB) + guests (relational)

CREATE TABLE events (
  id          text PRIMARY KEY,
  slug        text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 80),
  is_demo     boolean NOT NULL DEFAULT false,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guests (
  id                text PRIMARY KEY,
  event_id          text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  -- 128-bit random, base64url. Unguessable capability for the guest link.
  token             text NOT NULL UNIQUE,
  name              text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  phone             text NOT NULL DEFAULT '' CHECK (length(phone) <= 20),
  table_number      text NOT NULL DEFAULT 'Por asignar' CHECK (length(table_number) <= 60),
  passes_allocated  integer NOT NULL CHECK (passes_allocated BETWEEN 1 AND 30),
  passes_confirmed  integer NOT NULL DEFAULT 0 CHECK (passes_confirmed >= 0 AND passes_confirmed <= passes_allocated),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  dietary_notes     text NOT NULL DEFAULT '' CHECK (length(dietary_notes) <= 300),
  message           text NOT NULL DEFAULT '' CHECK (length(message) <= 1000),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guests_event_id_idx ON guests(event_id);
