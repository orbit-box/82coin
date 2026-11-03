-- Additive virtual futures order idempotency only; existing account and positions untouched.
CREATE TABLE IF NOT EXISTS paper_requests (
 member_id INTEGER NOT NULL REFERENCES members(id),
 key UUID NOT NULL,
 response JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(member_id,key)
);
CREATE INDEX IF NOT EXISTS paper_requests_member_time_idx ON paper_requests(member_id,created_at DESC);
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS opening_fee_krw NUMERIC(22,4) NOT NULL DEFAULT 0;
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS closing_fee_krw NUMERIC(22,4) NOT NULL DEFAULT 0;
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS entry_fx_krw NUMERIC(18,6);
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS exit_fx_krw NUMERIC(18,6);
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS opening_reference TEXT;
ALTER TABLE paper_positions ADD COLUMN IF NOT EXISTS closing_reference TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS paper_positions_open_reference_unique ON paper_positions(opening_reference) WHERE opening_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS paper_positions_close_reference_unique ON paper_positions(closing_reference) WHERE closing_reference IS NOT NULL;
