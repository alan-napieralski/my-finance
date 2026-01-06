BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_account text,
  posted_on date NOT NULL,
  amount numeric(14, 2) NOT NULL,
  balance numeric(14, 2),
  description text NOT NULL,
  category text,
  fingerprint text NOT NULL,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_source_fingerprint_uq
  ON transactions (source_system, fingerprint);

CREATE INDEX IF NOT EXISTS transactions_posted_on_idx
  ON transactions (posted_on DESC);

CREATE INDEX IF NOT EXISTS transactions_source_system_idx
  ON transactions (source_system);

DROP TRIGGER IF EXISTS set_transactions_updated_at ON transactions;
CREATE TRIGGER set_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

CREATE TABLE IF NOT EXISTS ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system text NOT NULL,
  source_account text,
  received_at timestamptz NOT NULL DEFAULT now(),
  rows_seen integer NOT NULL,
  rows_inserted integer NOT NULL,
  rows_skipped_duplicates integer NOT NULL,
  meta jsonb
);

COMMIT;
