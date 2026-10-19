# 82coin Virtual Futures Championship — implementation contract (draft)
Status: design/technical specification, NOT an active trading service.

## UX
- New dedicated /paper-trading route (do not add a live order button before server endpoints are tested).
- Top: podium ranks #2, #1, #3; nickname, net monthly PnL KRW and ROI, one-liner <=32 Unicode characters.
- Below: verified monthly leaderboard and authenticated paper-trading terminal, position history; responsive.
- 1st/2nd/3rd badges on community authors verified server-side, not client claims.
- Explicit banner: **가상매매: 현금 가치 없음, 실제 주문 없음, 수익 보장 아님**.

## Competition
- Starting virtual equity: KRW 1,000,000 per member.
- Contract model must be specified: USDT-margined linear perpetual with USDT/KRW snapshot conversion, mark/index price, fees, maintenance margin, funding, price timestamps.
- Never price using cached stale feeds without explicit stale/disabled trading state.
- Market order execution server-side with pessimistic spreads and deterministic latency rules; prohibit client-submitted execution price or PnL.
- Open positions, locked margin, free virtual balance, realized/unrealized PnL, cumulative net funding and fees.
- Atomic PostgreSQL transactions for every order, fill, reset and settlement; member row locking, idempotency keys, nonnegative available margin; event ledger + audit.
- Liquidation simulation, reduce-only close, position caps and leverage limits must be completed before order functionality is released.

## Weekly wallet reset
- Only if account equity <= KRW 500,000, excluding money locked in open positions from misleading available balance.
- Maximum 2 uses per Monday 00:00-Sunday 23:59:59 Asia/Seoul week.
- All positions must be closed and settled before reset; wallet reset cannot erase audit.
- Reset restores wallet equity to 1,000,000 virtual KRW.
- Track external-adjustment amount separately from net trading PnL and monthly leaderboard returns.
- Fairness safeguard: a reset NEVER wipes historic monthly trading losses. Compute season PnL as equity - starting equity - sum(reset injections). Derive ROI consistently, with a disclosed method; monthly refresh uses equity snapshot baseline including open positions.
- Decide whether wallet reset disqualifies a member from prize ranking before public release.

## Monthly season
- Asia/Seoul calendar monthly boundaries, top 3 snapshot and rank finalized atomically after mark prices and liabilities are settled, then new leaderboard begins on 1st.
- Distinguish month rollover from wallet reset: do not silently erase member funds/positions.
- Rank by verified adjusted monthly ROI, tie-break by adjusted PnL then timestamp; minimum trade count/volume to avoid 1-trade exploits.
- Community author badge drawn from active-season finalized rank snapshot or explicit current-rank data; decide whether badge is past month's champion vs current provisional rank before release.
- Preserve permanent previous-month winners and prevent moderation-sanctioned users from ranking or posting one-liners.

## 32-character champion message
- Trim & normalize Unicode, count Unicode code points/grapheme clusters consistently in client & server; enforce max 32; escaped content in UI.
- Advertising, phishing, referral links, phone/contact info, impersonation prohibited; report and moderator remove/suspend controls, audit actions.
- Visibility restricted to top three and reviewed/sanitized updates.

## Security/operations
- Server sessionId() authentication and authorization on all writes.
- Rate limit, CSRF protection for session cookie writes, idempotency and replay defense.
- Data quality: source and freshness, reconnect handling, exchange symbol mapping.
- Do not add real-money deposits, payouts, trading APIs or rewards implying cash value.
- Unit/integration tests: fee and funding, ROI, liquidations, race resets, weekly limits, season rollover across KST month/week boundaries, ranking ties, moderation, stale price, mobile responsiveness.
- Migrations additive only; never delete members/posts, protect DB with backup before live rollout.

## Release stages
1. Validated schema + contract simulator + test fixtures, no public order UI.
2. Persistent virtual wallet, authenticated paper orders with mark price/fees/liquidation and concurrency tests.
3. Audited monthly leaderboard, podium and one-liners, reset limits.
4. Community badge integration and moderator tools.
5. Canary deployment and real-user rollout after failure-path testing.

Blocking product choice: define whether weekly wallet resets disqualify prize-ranking or allow adjusted lifetime-monthly PnL. Do not launch until resolved.
