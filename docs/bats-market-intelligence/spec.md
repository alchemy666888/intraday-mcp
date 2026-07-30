# Feature Specification: BATS Market Intelligence

**Feature name:** `bats-market-intelligence`  
**Feature ID:** `bats-market-intelligence`  
**Repository path:** `docs/bats-market-intelligence`  
**Status:** Proposed  
**Primary user:** ChatGPT Project running BATS `START` and `CHECK`  
**Scope:** Read-only BTC market research data and deterministic feature generation

## 1. Problem statement

The current MCP supplies useful live snapshots but cannot consistently establish the complete BATS data stack. It lacks historical arrays and calculated indicators, and some supplemental feeds fail because their collectors or rate-limit controls are incomplete. As a result, the ChatGPT Project correctly returns `DATA INSUFFICIENT — NO TRADE IDEA` even when enough upstream raw data could have been fetched and calculated.

The enhanced MCP must convert the current snapshot wrapper into a resilient, provenance-rich market-data and feature service.

## 2. Goals

1. Supply sufficient closed historical candles for `5m`, `15m`, `1h`, `4h`, and `1d` analysis.
2. Calculate BATS technical and regime features deterministically.
3. Persist derivatives history required for OI changes and funding context.
4. Operationalize liquidation and options feeds with explicit coverage and degradation behavior.
5. Provide official macro-event context and structured news metadata.
6. Expose one consolidated BATS context tool while preserving existing tools.
7. Distinguish execution-critical, regime-critical, strategy-specific and optional missing data.

## 3. Non-goals

- Trade execution or exchange account access.
- Guaranteed forecasts, profits, win rates or personalized financial advice.
- Claiming global liquidation/OI coverage from a limited venue set.
- Social-media rumor ingestion as verified fact.
- Tick-level/HFT execution infrastructure.

## 4. Baseline external contract

The existing MCP exposes:

- `get_btc_intraday_snapshot`
- `get_btc_liquidations`
- `get_btc_options_surface`
- `get_btc_perpetual_context`
- `get_btc_report_context`
- `get_btc_timeframes`
- `get_market_data_health`

All are read-only. Existing tool signatures must remain compatible.

## 5. User stories

### US-1 — Complete core BATS scan (P1)

As a ChatGPT Project, I need closed historical candles, technical indicators, market state, session VWAP and reference levels in one call so I can determine whether a valid BATS signal stack exists.

**Independent acceptance:** The context returns complete core data without liquidations, options or news being mandatory.

### US-2 — Reliable `CHECK` comparison (P1)

As a ChatGPT Project, I need consistent timestamps, calculation versions and prior/current feature values so I can compare a new scan with the prior scan without rewriting history.

**Independent acceptance:** Repeated calls expose closed-bar identity, source times and stable indicator values for already-closed bars.

### US-3 — Strategy-specific degradation (P1)

As a ChatGPT Project, I need missing optional feeds to disable only affected strategies so an options outage does not invalidate a core PA + momentum + VWAP setup.

**Independent acceptance:** `executionCriticalComplete` remains true while `optionalContextComplete` is false when options are unavailable.

### US-4 — Derivatives positioning context (P2)

As a market analyst, I need OI changes, funding history, basis and liquidation aggregates with venue labels so I can distinguish leverage expansion, deleveraging and spot-led moves.

### US-5 — Event-risk gate (P2)

As a ChatGPT Project, I need upcoming high-impact events and released actual/consensus/previous values so I can block or delay setups around material releases.

### US-6 — Operational diagnosis (P2)

As an operator, I need provider, collector, storage and calculation health metrics so I can identify why a field is stale or unavailable.

## 6. Functional requirements

### A. Historical market data

- **FR-001:** Provide closed OHLCV arrays for `5m`, `15m`, `1h`, `4h`, and `1d`.
- **FR-002:** Support a configurable limit from 50 to 500 candles; internal backfill may exceed 500.
- **FR-003:** Return current/open candles only when explicitly requested and mark `isClosed`.
- **FR-004:** Normalize numeric fields to finite numbers while preserving raw source identifiers where useful.
- **FR-005:** Detect gaps, duplicates, out-of-order candles and inconsistent intervals.
- **FR-006:** Support at least one primary provider and one fallback provider for core candles where legally and operationally feasible.

### B. Technical indicators

- **FR-010:** Calculate EMA20, EMA50 and EMA200.
- **FR-011:** Calculate RSI14 using Wilder smoothing.
- **FR-012:** Calculate MACD(12,26,9), including line, signal and histogram.
- **FR-013:** Calculate ATR14 using true range and Wilder smoothing.
- **FR-014:** Calculate ADX14, +DI and -DI using Wilder smoothing.
- **FR-015:** Return current and prior closed-bar values and indicator warm-up completeness.
- **FR-016:** Version calculation conventions and expose the version in responses.

### C. Market state and levels

- **FR-020:** Classify trend as `bullish_trend`, `bearish_trend`, `range`, or `transition` from deterministic 1h/4h rules.
- **FR-021:** Map only qualified bullish/bearish states to BATS `T`; range to `R`; transition to `X` and mark state-dependent strategies unconfirmed.
- **FR-022:** Calculate the daily ATR regime ratio: daily ATR14 divided by the 20-observation average of daily ATR14.
- **FR-023:** Classify volatility as `H` above 1.50, `L` below 0.70, otherwise `N`.
- **FR-024:** Calculate cumulative session VWAP and price deviation using a named anchor.
- **FR-025:** Return daily UTC VWAP and configurable Asia/Europe/US session VWAPs.
- **FR-026:** Identify confirmed 1h and 4h swing highs/lows using a non-repainting pivot method.
- **FR-027:** Return prior-day high/low/close, current-week open, session highs/lows and recent confirmed swings.
- **FR-028:** Return the full market-state code and evidence fields.

### D. Open interest, funding and basis

- **FR-030:** Persist OI snapshots at least every five minutes; one-minute sampling is preferred.
- **FR-031:** Calculate OI changes for 5m, 15m, 1h, 4h and 24h where coverage exists.
- **FR-032:** Persist and return funding history and changes.
- **FR-033:** Calculate spot-perpetual basis from timestamp-aligned venue-labelled prices.
- **FR-034:** Never describe one venue's OI as global OI.
- **FR-035:** Return coverage start and missing-history reasons.

### E. Liquidations

- **FR-040:** Run liquidation collectors independently of MCP request execution.
- **FR-041:** Normalize liquidation events with venue, symbol, side liquidated, price, quantity, notional, event time and receipt time.
- **FR-042:** Deduplicate events using venue event IDs or stable fingerprints.
- **FR-043:** Store rolling events and aggregate 5m, 15m and 1h values.
- **FR-044:** Return long, short and total notional, count, largest event and last event time.
- **FR-045:** Return collector connectivity, coverage start and venue coverage.
- **FR-046:** Missing liquidation infrastructure must set `strategySpecificComplete.C1=false`, not globally fail core context.

### F. Options

- **FR-050:** Maintain a Deribit market-data WebSocket connection for selected BTC option instruments.
- **FR-051:** Initialize and update the instrument universe without excessive REST polling.
- **FR-052:** Cache expiry summaries, ATM IV, 25-delta call/put IV, risk reversal, butterfly, Greeks and OI when supplied.
- **FR-053:** Use batching, rate-limit budgets, exponential backoff, jitter and a circuit breaker.
- **FR-054:** Return last-known-good data as `stale`, never as `live`.
- **FR-055:** Options unavailability must not set core execution data incomplete.

### G. News and macro events

- **FR-060:** Ingest scheduled high-impact US macro events from official sources.
- **FR-061:** Store event name, source, scheduled UTC/MYT times, importance and status.
- **FR-062:** After release, store actual, consensus, previous and calculated surprise when legally available.
- **FR-063:** Ingest material BTC news metadata from configured reputable sources or return `unavailable`.
- **FR-064:** Separate official facts from publisher interpretation.
- **FR-065:** Deduplicate events/news and preserve source URLs internally or as citations where the client supports them.

### H. Consolidated BATS context

- **FR-070:** Add `get_btc_bats_context` as the preferred ChatGPT-facing tool.
- **FR-071:** Align sections to a common `asOf` target and report per-section skew.
- **FR-072:** Return `executionCriticalComplete`, `regimeCriticalComplete`, `strategySpecificComplete`, and `optionalContextComplete`.
- **FR-073:** Enumerate missing, stale and unavailable fields with reasons.
- **FR-074:** Return raw evidence and calculated features; do not return trade advice.
- **FR-075:** Keep `get_btc_report_context` operational and mark it as compact/legacy in documentation.

### I. MCP contract quality

- **FR-080:** Every new or materially enhanced tool must define an input schema and output schema.
- **FR-081:** Structured results must conform to the declared output schema.
- **FR-082:** Return serialized JSON text for compatibility where required by the MCP client.
- **FR-083:** Use tool-result error state only for tool execution failures; use field-level `status` for partial upstream data.
- **FR-084:** Add schema version and calculation version.
- **FR-085:** Annotate tools as read-only where supported.

## 7. Non-functional requirements

- **NFR-001 Availability:** Core cached context monthly availability target ≥99.5%, excluding provider-wide outages.
- **NFR-002 Freshness:** live price/perpetual sections target age ≤15 seconds; candles target age no greater than one expected bar interval plus 10 seconds.
- **NFR-003 Latency:** cached `get_btc_bats_context` p95 ≤2.5 seconds; refresh path p95 ≤10 seconds.
- **NFR-004 Accuracy:** indicator golden tests must match approved reference vectors within documented tolerance.
- **NFR-005 Idempotency:** repeated calculation over identical normalized inputs yields byte-equivalent feature values except receipt/latency metadata.
- **NFR-006 Security:** no secret values in responses, logs or exceptions.
- **NFR-007 Observability:** all upstream calls, cache use, calculation duration and completeness outcomes are metrically visible.
- **NFR-008 Backward compatibility:** existing tools pass their pre-change contract test suite.
- **NFR-009 Cost control:** provider calls are deduplicated and cache-aware; WebSocket feeds are shared across requests.

## 8. Success criteria

1. A normal `get_btc_bats_context` call returns complete core BATS data for all required timeframes.
2. The Project can calculate a valid PA + momentum + VWAP stack without manually deriving indicators.
3. Options outage leaves `executionCriticalComplete=true` when core data is healthy.
4. Liquidation outage disables only liquidation-dependent logic.
5. Closed historical bars retain stable indicator values across subsequent calls.
6. Every field used in analysis has explicit source, timestamp, freshness and calculation method.
7. ChatGPT recognizes updated/new tools after app action refresh or republishing.
