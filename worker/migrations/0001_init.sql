-- Initial schema (SPEC §9.5). Apply with:
--   npx wrangler d1 migrations apply monument-signs --local     (development)
--   npx wrangler d1 migrations apply monument-signs --remote    (production)

CREATE TABLE IF NOT EXISTS requests (
  id           TEXT PRIMARY KEY,
  reference    TEXT NOT NULL UNIQUE,
  type         TEXT NOT NULL CHECK (type IN ('quote', 'drawing')),
  created_at   TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  organization TEXT,
  zip          TEXT,
  fields       TEXT NOT NULL,              -- every submitted field, as JSON
  design       TEXT,                       -- the builder state, as JSON
  files        TEXT NOT NULL DEFAULT '[]', -- R2 keys, as JSON
  lighting     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  created_at        TEXT NOT NULL,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  zip               TEXT,
  design            TEXT NOT NULL,         -- the builder state, as JSON
  total             INTEGER NOT NULL,      -- whole US dollars, computed on the server
  deposit           INTEGER NOT NULL,      -- whole US dollars, computed on the server
  stripe_session_id TEXT,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid',
  paid_at           TEXT
);
CREATE INDEX IF NOT EXISTS orders_stripe_session ON orders (stripe_session_id);

CREATE TABLE IF NOT EXISTS stripe_events (
  id          TEXT PRIMARY KEY,
  received_at TEXT NOT NULL
);
