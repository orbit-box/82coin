-- 82coin paper futures schema v1 (additive, no changes to existing posts/members)
CREATE TABLE IF NOT EXISTS paper_accounts (
 member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
 balance_krw NUMERIC(22,4) NOT NULL DEFAULT 1000000,
 cumulative_reset_adjustment_krw NUMERIC(22,4) NOT NULL DEFAULT 0,
 trading_realized_pnl_krw NUMERIC(22,4) NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT paper_balance_finite CHECK(balance_krw >= 0)
);
CREATE TABLE IF NOT EXISTS paper_positions (
 id BIGSERIAL PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES members(id),
 symbol VARCHAR(24) NOT NULL,
 side VARCHAR(5) NOT NULL CHECK(side IN ('LONG','SHORT')),
 quantity NUMERIC(26,10) NOT NULL CHECK(quantity > 0),
 entry_price_usdt NUMERIC(26,10) NOT NULL CHECK(entry_price_usdt > 0),
 leverage INTEGER NOT NULL CHECK(leverage BETWEEN 1 AND 20),
 margin_krw NUMERIC(22,4) NOT NULL CHECK(margin_krw > 0),
 opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 closed_at TIMESTAMPTZ,
 closing_price_usdt NUMERIC(26,10),
 realized_pnl_krw NUMERIC(22,4),
 CHECK (closed_at IS NULL OR closing_price_usdt IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS paper_positions_open_member_idx ON paper_positions(member_id) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS paper_ledger (
 id BIGSERIAL PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES members(id),
 kind VARCHAR(32) NOT NULL CHECK(kind IN ('INITIAL','RESET','TRADE_PNL','FEE','FUNDING','LIQUIDATION','MONTH_BOUNDARY')),
 amount_krw NUMERIC(22,4) NOT NULL,
 balance_after_krw NUMERIC(22,4),
 reference_key TEXT UNIQUE,
 details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paper_ledger_member_time_idx ON paper_ledger(member_id,created_at DESC);
CREATE TABLE IF NOT EXISTS paper_resets (
 id BIGSERIAL PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES members(id),
 week_key VARCHAR(10) NOT NULL,
 amount_krw NUMERIC(22,4) NOT NULL CHECK(amount_krw >= 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS paper_resets_member_week_idx ON paper_resets(member_id,week_key);
CREATE TABLE IF NOT EXISTS paper_seasons (
 month_key VARCHAR(7) PRIMARY KEY,
 opens_at TIMESTAMPTZ NOT NULL,
 closes_at TIMESTAMPTZ NOT NULL,
 finalized_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS paper_season_entries (
 month_key VARCHAR(7) NOT NULL REFERENCES paper_seasons(month_key),
 member_id INTEGER NOT NULL REFERENCES members(id),
 start_equity_krw NUMERIC(22,4) NOT NULL,
 reset_injections_krw NUMERIC(22,4) NOT NULL DEFAULT 0,
 closed_trade_count INTEGER NOT NULL DEFAULT 0,
 last_activity_at TIMESTAMPTZ,
 one_liner VARCHAR(128) NOT NULL DEFAULT '',
 one_liner_hidden BOOLEAN NOT NULL DEFAULT false,
 moderation_reason TEXT,
 PRIMARY KEY(month_key,member_id)
);
CREATE TABLE IF NOT EXISTS paper_season_awards (
 month_key VARCHAR(7) NOT NULL REFERENCES paper_seasons(month_key),
 rank SMALLINT NOT NULL CHECK(rank BETWEEN 1 AND 3),
 member_id INTEGER NOT NULL REFERENCES members(id),
 adjusted_pnl_krw NUMERIC(22,4) NOT NULL,
 adjusted_roi_percent NUMERIC(15,5) NOT NULL,
 awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(month_key,rank),
 UNIQUE(month_key,member_id)
);
CREATE TABLE IF NOT EXISTS paper_audit (
 id BIGSERIAL PRIMARY KEY,
 member_id INTEGER REFERENCES members(id),
 action VARCHAR(48) NOT NULL,
 context JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
