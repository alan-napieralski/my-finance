BEGIN;

CREATE TABLE IF NOT EXISTS income_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  description_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS income_rules_description_key_uq
  ON income_rules (description_key);

DROP TRIGGER IF EXISTS set_income_rules_updated_at ON income_rules;
CREATE TRIGGER set_income_rules_updated_at
BEFORE UPDATE ON income_rules
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMIT;
