CREATE TABLE IF NOT EXISTS liquidation_events (
 id BIGSERIAL PRIMARY KEY, venue TEXT NOT NULL, symbol TEXT NOT NULL,
 position_side TEXT NOT NULL CHECK(position_side IN ('LONG','SHORT')),
 occurred_at TIMESTAMPTZ NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 price NUMERIC(30,10) NOT NULL CHECK(price>0), quantity NUMERIC(30,10) NOT NULL CHECK(quantity>0),
 amount_usdt NUMERIC(30,8) NOT NULL CHECK(amount_usdt>0),
 event_key TEXT NOT NULL, coverage_type TEXT NOT NULL,
 UNIQUE(venue,event_key)
);
CREATE INDEX IF NOT EXISTS liquidation_window_idx ON liquidation_events(occurred_at DESC,venue,symbol);
CREATE TABLE IF NOT EXISTS collector_status (
 source TEXT PRIMARY KEY, connected BOOLEAN NOT NULL DEFAULT false,
 last_heartbeat TIMESTAMPTZ, last_event_at TIMESTAMPTZ,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_error TEXT, updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS collector_coverage (
 source TEXT NOT NULL, minute TIMESTAMPTZ NOT NULL,
 connected_seconds INTEGER NOT NULL DEFAULT 0 CHECK(connected_seconds BETWEEN 0 AND 60),
 PRIMARY KEY(source,minute)
);
CREATE INDEX IF NOT EXISTS collector_coverage_minute_idx ON collector_coverage(minute DESC);
CREATE TABLE IF NOT EXISTS futures_market_snapshots (
 id BIGSERIAL PRIMARY KEY,venue TEXT NOT NULL,symbol TEXT NOT NULL,
 captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 funding_rate NUMERIC(18,10),long_pct NUMERIC(10,5),short_pct NUMERIC(10,5),
 open_interest NUMERIC(30,8),mark_price NUMERIC(30,10)
);
CREATE INDEX IF NOT EXISTS futures_snapshot_index ON futures_market_snapshots(venue,symbol,captured_at DESC);
