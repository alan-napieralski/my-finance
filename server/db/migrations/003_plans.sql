BEGIN;

CREATE TABLE IF NOT EXISTS plans_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_amount numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans_wants (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  monthly_amount numeric(14, 2) NOT NULL DEFAULT 0,
  target_amount numeric(14, 2),
  target_date date,
  months_to_target integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans_debts (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  total_debt numeric(14, 2) NOT NULL DEFAULT 0,
  deadline date,
  monthly_payment numeric(14, 2),
  interest_rate numeric(8, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plans_recurring_payments (
  id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  monthly_amount numeric(14, 2) NOT NULL DEFAULT 0,
  category text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_plans_savings_updated_at ON plans_savings;
CREATE TRIGGER set_plans_savings_updated_at
BEFORE UPDATE ON plans_savings
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS set_plans_wants_updated_at ON plans_wants;
CREATE TRIGGER set_plans_wants_updated_at
BEFORE UPDATE ON plans_wants
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS set_plans_debts_updated_at ON plans_debts;
CREATE TRIGGER set_plans_debts_updated_at
BEFORE UPDATE ON plans_debts
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS set_plans_recurring_updated_at ON plans_recurring_payments;
CREATE TRIGGER set_plans_recurring_updated_at
BEFORE UPDATE ON plans_recurring_payments
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

COMMIT;
