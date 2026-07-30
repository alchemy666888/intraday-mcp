# Ordered Implementation Tasks: BATS Market Intelligence

**Feature name:** `bats-market-intelligence`  
**Repository path:** `docs/bats-market-intelligence`  

Tasks are written to be executable after `T000` maps logical components to the actual repository.

## Phase 0 — Source audit and baseline

- [ ] **T000A [P1] Add the approved SDD documents under `docs/bats-market-intelligence` and commit them on `feat/bats-market-intelligence`.**
  - Deliverable: the six files listed in the package manifest.
  - Acceptance: paths, headings, feature metadata and internal references use `bats-market-intelligence`; YAML parses successfully.

- [ ] **T000 [P1] Audit repository structure.** Record language/runtime, MCP SDK, deployment platform, current providers, schemas, caches, test framework and exact paths for all seven existing tools.
  - Deliverable: `docs/bats-market-intelligence/source-audit.md` with file/function map.
  - Acceptance: every existing tool maps to handler, service and provider paths.

- [ ] **T001 [P1] Capture existing tool contracts as fixtures.** Save tool list, input schemas and representative normal/partial responses.
  - Acceptance: backward-compatibility tests fail on unapproved field removal/type changes.

- [ ] **T002 [P1] Add response schema-validation harness.** Validate proposed output schemas in unit/contract tests.

- [ ] **T003 [P1] Add source/quality common model.** Centralize status, timestamp, age, venue, fallback and warnings.

## Phase 1 — Historical candles

- [ ] **T010 [P1] Define `CandleProvider` and normalized Candle model.**
- [ ] **T011 [P1] Implement primary historical candle adapter using the repository's existing preferred venue.**
- [ ] **T012 [P1] Implement Hyperliquid candleSnapshot fallback for 5m/15m/1h/4h/1d.**
- [ ] **T013 [P1] Implement candle validation, sorting, deduplication and gap detection.**
- [ ] **T014 [P1] Add durable candle repository/upsert logic.**
- [ ] **T015 [P1] Implement `get_btc_market_history`.**
- [ ] **T016 [P1] Add fixture and live integration tests for 300 closed bars per timeframe.**

## Phase 2 — Deterministic BATS features

- [ ] **T020 [P1] Implement EMA20/50/200 pure functions and golden tests.**
- [ ] **T021 [P1] Implement Wilder RSI14 and golden tests.**
- [ ] **T022 [P1] Implement MACD(12,26,9) and golden tests.**
- [ ] **T023 [P1] Implement ATR14, +DI/-DI and ADX14 with golden tests.**
- [ ] **T024 [P1] Implement indicator warm-up and closed-bar guard.**
- [ ] **T025 [P1] Implement session VWAP profiles with quote/base and approximation methods.**
- [ ] **T026 [P1] Implement confirmed pivot 2x2 swing detection.**
- [ ] **T027 [P1] Implement trend/range/transition classification.**
- [ ] **T028 [P1] Implement daily ATR regime and intraday ATR percentage.**
- [ ] **T029 [P1] Implement prior-day, weekly and session reference levels.**
- [ ] **T030 [P1] Implement `get_btc_bats_features` with calculation version.**

## Phase 3 — OI, funding and basis history

- [ ] **T040 [P2] Define derivatives snapshot repository.**
- [ ] **T041 [P2] Implement scheduled OI/funding collector with one-minute preferred cadence.**
- [ ] **T042 [P2] Add unique keys and idempotent upserts for snapshots.**
- [ ] **T043 [P2] Implement nearest-prior lookback calculation for 5m/15m/1h/4h/24h OI changes.**
- [ ] **T044 [P2] Implement timestamp-aligned spot/perpetual basis.**
- [ ] **T045 [P2] Implement `get_btc_derivatives_history`.**
- [ ] **T046 [P2] Extend `get_btc_perpetual_context` additively with basis/OI changes.**

## Phase 4 — Liquidations

- [ ] **T050 [P2] Provision Redis/Upstash and configure server-side credentials.**
- [ ] **T051 [P2] Define liquidation provider interface and normalized event model.**
- [ ] **T052 [P2] Implement first supported venue WebSocket collector.**
- [ ] **T053 [P2] Add reconnect, heartbeat, backoff and jitter.**
- [ ] **T054 [P2] Add event deduplication and Redis sorted-set retention.**
- [ ] **T055 [P2] Implement 5m/15m/1h aggregation and coverage metadata.**
- [ ] **T056 [P2] Extend `get_btc_liquidations` without claiming global coverage.**
- [ ] **T057 [P2] Test collector disconnect, empty windows, duplicate events and partial venue coverage.**

## Phase 5 — Deribit options

- [ ] **T060 [P2] Implement Deribit WebSocket connection manager.**
- [ ] **T061 [P2] Implement narrow instrument universe: configured expiries and ATM-adjacent strikes.**
- [ ] **T062 [P2] Implement batched subscriptions and lifecycle updates.**
- [ ] **T063 [P2] Normalize option ticker/Greeks/OI records.**
- [ ] **T064 [P2] Calculate expiry summaries and 25-delta metrics when inputs permit.**
- [ ] **T065 [P2] Cache last-known-good surface and add stale status.**
- [ ] **T066 [P2] Implement provider request budget, 429 circuit and singleflight refresh.**
- [ ] **T067 [P2] Extend `get_btc_options_surface` additively.**

## Phase 6 — Macro events and news

- [ ] **T070 [P2] Define macro/news provider interfaces and normalized models.**
- [ ] **T071 [P2] Implement official release-calendar ingestion for configured agencies.**
- [ ] **T072 [P2] Implement release-result updates and revision handling.**
- [ ] **T073 [P2] Calculate UTC and Asia/Kuala_Lumpur display times.**
- [ ] **T074 [P3] Integrate a licensed/reputable BTC news metadata provider or explicitly return unavailable.**
- [ ] **T075 [P2] Add event/news deduplication and materiality rules.**
- [ ] **T076 [P2] Implement `get_btc_event_risk`.**

## Phase 7 — Consolidated context and quality gates

- [ ] **T080 [P1] Implement core/supplemental section orchestration with bounded parallelism.**
- [ ] **T081 [P1] Implement timestamp alignment and section-skew calculation.**
- [ ] **T082 [P1] Implement execution/regime/strategy/optional quality gate.**
- [ ] **T083 [P1] Implement `get_btc_bats_context` and output-schema validation.**
- [ ] **T084 [P1] Preserve `get_btc_report_context`; document it as compact legacy.**
- [ ] **T085 [P1] Extend health output with providers, collectors, storage and features.**

## Phase 8 — Reliability, security and observability

- [ ] **T090 [P1] Add provider timeouts, retry budgets, jitter and circuit breakers.**
- [ ] **T091 [P1] Add cache singleflight/request coalescing.**
- [ ] **T092 [P1] Add metrics and structured logs defined in plan.md.**
- [ ] **T093 [P1] Add secret redaction and outbound-domain controls.**
- [ ] **T094 [P1] Add stale-cache and clock-skew tests.**
- [ ] **T095 [P1] Run load tests for cached and refresh paths.**

## Phase 9 — Release

- [ ] **T100 [P1] Run all unit, contract, integration and acceptance tests.**
- [ ] **T101 [P1] Compare enhanced context against current production responses.**
- [ ] **T102 [P1] Publish calculation and schema versions.**
- [ ] **T103 [P1] Deploy behind feature flags/canary.**
- [ ] **T104 [P1] Refresh ChatGPT app actions and review diffs.**
- [ ] **T105 [P1] Update Project instructions to call `get_btc_bats_context` first.**
- [ ] **T106 [P1] Monitor completeness, latency, stale use and provider errors through the canary period.**
