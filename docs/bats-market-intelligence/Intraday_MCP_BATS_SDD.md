# Intraday MCP — BATS Market Intelligence SDD Package


---

<!-- EMBEDDED SECTION: README.md -->

# Intraday MCP — BATS Market Intelligence SDD Package

This package defines the `bats-market-intelligence` specification-driven enhancement for the BTC Intraday Market Data MCP so a ChatGPT Project can run BATS `START` and `CHECK` workflows with deterministic, timestamped, execution-grade inputs.

## Source-code mapping status

This SDD was derived from the live MCP tool contracts, observed production responses, and the stated BATS requirements. Repository-specific file and function locations remain provisional until task `T000` maps the design to the checked-out source tree.

- The external behavior and compatibility requirements are grounded in the seven observed read-only MCP tools.
- Component names and target paths in the implementation plan are logical boundaries, not asserted line-level findings.
- Implementation must not begin until the source audit records the actual handlers, providers, schemas, storage, tests and deployment structure.

## Current MCP baseline observed

The live MCP exposes seven read-only tools:

1. `get_btc_intraday_snapshot`
2. `get_btc_liquidations`
3. `get_btc_options_surface`
4. `get_btc_perpetual_context`
5. `get_btc_report_context`
6. `get_btc_timeframes`
7. `get_market_data_health`

Observed limitations:

- Candle coverage is limited to `5m`, `15m`, and `1h`, generally current/latest-closed bars rather than historical arrays.
- RSI, MACD, EMA, ADX, ATR, session VWAP, 4h structure, prior-day/weekly levels, and OI changes are not exposed.
- Liquidations are unavailable when Redis/collector infrastructure is absent.
- Deribit options can become unavailable under upstream rate limiting.
- News and macro-event context is outside the present market-data toolset.

## Feature identity and repository placement

- **Feature name:** `bats-market-intelligence`
- **Repository path:** `docs/bats-market-intelligence`
- **Suggested branch:** `feat/bats-market-intelligence`
- **Suggested commit:** `docs: add bats-market-intelligence SDD`

## Package contents

The ZIP is rooted for extraction at the repository root and contains exactly:

- `docs/bats-market-intelligence/Intraday_MCP_BATS_SDD.md` — combined SDD reference.
- `docs/bats-market-intelligence/spec.md` — product and functional specification.
- `docs/bats-market-intelligence/plan.md` — architecture, delivery and rollout plan.
- `docs/bats-market-intelligence/tasks.md` — ordered implementation backlog.
- `docs/bats-market-intelligence/mcp-tools.yaml` — proposed MCP tool contracts.
- `docs/bats-market-intelligence/acceptance-tests.md` — end-to-end and degraded-mode acceptance tests.

The combined document retains the engineering constitution, research, data model, checklist, quickstart and implementation notes as embedded sections.

## Target outcome

A single `get_btc_bats_context` call should return timestamp-aligned:

- sufficient closed historical candles;
- deterministic technical indicators;
- trend/range and volatility classification;
- session VWAP and deviation;
- 1h/4h structure and reference levels;
- funding, basis, OI and OI changes;
- liquidation status with explicit venue coverage;
- options status with freshness and stale-cache handling;
- scheduled/released macro events and material BTC news metadata;
- field-level provenance, freshness, completeness and warnings.

The service remains **read-only market research infrastructure**. It does not place orders and does not promise profitable outcomes.


---

<!-- EMBEDDED SECTION: .specify/memory/constitution.md -->

# Intraday MCP Engineering Constitution

## 1. Provenance is mandatory

Every market value MUST identify:

- source/provider;
- venue;
- instrument and market type;
- source timestamp;
- server receipt timestamp;
- age/freshness status;
- calculation method when derived;
- warnings and fallback status.

No cross-venue value may be presented as venue-global or market-global unless coverage supports that claim.

## 2. Deterministic calculations belong in code

RSI, MACD, EMA, ATR, ADX, VWAP, reference levels, structure classification and OI changes MUST be calculated by deterministic, versioned functions. The language model interprets results; it MUST NOT be responsible for numerically deriving production indicators from raw candles.

Each calculation MUST expose its parameters and calculation version.

## 3. Closed-bar integrity

Execution-facing indicators and price-action signals MUST default to closed candles only. Open candles may be returned for monitoring, but MUST be explicitly marked `isClosed: false` and MUST NOT silently enter confirmed-signal calculations.

## 4. Fail closed, degrade narrowly

Missing execution-critical inputs MUST produce an explicit incomplete data gate. Missing optional or strategy-specific inputs MUST disable only affected analyses.

Examples:

- Missing RSI/MACD or session VWAP: execution-critical; BATS idea cannot be confirmed.
- Missing liquidations: disable liquidation-dependent C1 logic only.
- Missing options: lower contextual completeness only.
- Missing news provider: retain official macro calendar if available and mark news incomplete.

The service MUST never fabricate substitute data.

## 5. Read-only scope

All MCP tools in this feature are read-only. No order placement, position modification, account access, or automated trading is permitted.

Tool annotations SHOULD declare read-only behavior where supported.

## 6. Backward compatibility

Existing seven tools and their current required fields MUST remain usable during the migration. New fields are additive. Breaking contract changes require:

- a versioned replacement tool or schema version;
- a deprecation period;
- contract tests;
- explicit release notes.

## 7. Time semantics are explicit

All stored timestamps MUST be UTC ISO-8601 or UTC epoch milliseconds. Session classification and user display time are derived from explicit IANA time zones.

Daily and weekly crypto reference levels default to:

- day: `00:00:00–23:59:59.999 UTC`;
- week: Monday `00:00:00 UTC`.

Alternate anchors MUST be named and returned in metadata.

## 8. Quality is a first-class domain object

Every tool response MUST include a quality block with:

- completeness category;
- stale/partial/unavailable fields;
- upstream and cache status;
- latency;
- coverage boundaries;
- calculation warnings;
- whether execution-critical fields are complete.

A tool-level HTTP/MCP success does not imply that all data sections are available.

## 9. Resilience without hidden staleness

Caching, retries and fallbacks are required, but stale data MUST be labeled. A last-known-good result may be returned only with its original timestamp, age, and stale reason.

Rate-limit responses MUST trigger backoff, jitter and circuit breaking rather than aggressive retry loops.

## 10. Testability and reproducibility

Every deterministic feature MUST have golden-vector tests. Provider adapters MUST have fixture-based contract tests. End-to-end tests MUST cover normal, stale, partial and unavailable states.

A result must be reproducible from the same normalized input dataset and calculation version.

## 11. Security and licensing

Secrets MUST be stored in deployment secret management, never returned by MCP tools or logged. Provider terms, redistribution rights and venue attribution requirements MUST be documented before production ingestion.

## 12. Observability

The service MUST emit metrics for:

- provider success/error/rate-limit counts;
- data age and gaps;
- collector connectivity;
- cache hit/miss/stale use;
- calculation duration;
- tool latency;
- completeness rates;
- schema-validation failures.


---

<!-- FILE: docs/bats-market-intelligence/spec.md -->

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


---

<!-- EMBEDDED SECTION: research.md -->

# Research and Technical Decisions

## R-1 — MCP result contracts

**Decision:** Define output schemas for all new tools and return structured content plus compatibility text.

**Rationale:** The MCP specification supports `outputSchema` and `structuredContent`; schema-conforming output reduces ambiguity and lets clients validate tool results.

**Reference:** Model Context Protocol tool specification: https://modelcontextprotocol.io/specification/2025-06-18/server/tools

## R-2 — Core candle history

**Decision:** Introduce a provider abstraction with at least one durable primary source and one fallback. Hyperliquid `candleSnapshot` is a suitable fallback for BTC perpetual candles and supports `5m`, `15m`, `1h`, `4h`, `1d` and other intervals, with up to the most recent 5,000 candles.

**Reference:** https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

**Provider policy:**

- Preserve venue/market type in every response.
- Do not silently merge spot and perpetual candles.
- If Binance returns geographic HTTP 451, use configured alternative endpoints/providers and expose the fallback.
- Respect HTTP 429 `Retry-After` and circuit-break the provider.

## R-3 — Indicator ownership

**Decision:** Indicators are deterministic backend features, not LLM calculations.

**Conventions:**

- EMA: recursive EMA with SMA seed after the period warm-up.
- RSI14: Wilder average gain/loss.
- MACD: EMA12 minus EMA26; signal EMA9; histogram line minus signal.
- ATR14: Wilder true range.
- ADX14: Wilder +DM/-DM, +DI/-DI, DX and ADX.
- All execution-facing values use closed candles by default.

**Version:** Start with `bats-indicators/1.0.0` and increment on any mathematical convention change.

## R-4 — Session VWAP

**Decision:** Prefer exact quote-volume/base-volume cumulative VWAP when both are present:

`VWAP = sum(quoteVolume) / sum(baseVolume)`

Fallback to candle approximation:

`sum(((high + low + close) / 3) * volume) / sum(volume)`

Return `method: quote_over_base` or `method: typical_price_approximation`.

**Default anchors:**

- `UTC_DAY`: 00:00 UTC to current time.
- `ASIA`: 00:00–08:00 UTC.
- `EUROPE`: 07:00–13:00 UTC.
- `US`: 13:00–21:00 UTC.

Anchors are configuration, not market truth. The active profile and boundaries must be returned.

## R-5 — Trend classification

**Decision:** Use deterministic evidence and allow a transition state.

- Bullish trend: 1h EMA20 > EMA50 > EMA200, close > EMA20, ADX14 ≥25, and confirmed HH/HL structure on 1h or 4h.
- Bearish trend: inverse conditions.
- Range: ADX14 ≤20 and no directional swing sequence; MA compression may support but not independently decide.
- Transition: all other combinations.

`transition` maps to BATS code `X`, preventing forced T/R classification.

## R-6 — Volatility regime

**Decision:** Use daily ATR14 compared with the 20-observation average of daily ATR14:

`ratio = current daily ATR14 / SMA20(daily ATR14)`

- High: ratio >1.50
- Low: ratio <0.70
- Normal: otherwise

Also expose intraday ATR percentage for stop-context analysis but do not substitute it for the daily regime.

## R-7 — Structure and reference levels

**Decision:** Use confirmed two-left/two-right pivots, optionally filtered by minimum ATR distance. A pivot is not final until the required right-hand candles close.

UTC defines prior-day and weekly levels by default. Alternate venue-day conventions require separate named profiles.

## R-8 — Storage architecture

**Decision:** Use durable SQL/time-series storage for history and Redis for rolling/cached state.

**Durable database:**

- candles;
- OI/funding snapshots;
- calculated feature snapshots;
- macro events/news metadata;
- provider audit records.

**Redis/Upstash:**

- current snapshots;
- distributed locks/singleflight state;
- rolling liquidation sorted sets;
- Deribit options cache;
- rate-limit/circuit state.

Upstash REST supports sorted sets, transactions, pipelines and environment-based credentials.

**Reference:** https://upstash.com/docs/redis/features/restapi

## R-9 — OI changes

**Decision:** Sample OI every minute when possible, no less frequently than every five minutes. Calculate change against the nearest valid snapshot at or before each requested lookback. Return actual elapsed time and coverage.

Do not infer global OI from Hyperliquid or any single venue.

## R-10 — Liquidations

**Decision:** Run collectors as persistent workers, separate from request handlers. Normalize and deduplicate venue events, write them to a rolling sorted set, and aggregate at request time or precompute windows.

A result must state:

- venues covered;
- globalCoverage=false unless contractually true;
- collector connection status;
- coverage start;
- last event timestamp;
- data gap warnings.

## R-11 — Deribit options

**Decision:** Replace per-request broad REST polling with WebSocket subscriptions and cache.

- Initialize selected expiries/strikes.
- Subscribe only to the required option ticker/instrument channels.
- Use instrument lifecycle notifications where appropriate.
- Batch subscriptions.
- Deduplicate concurrent refresh requests.
- Return stale last-known-good surface during temporary rate limiting.

Deribit recommends streaming for real-time data and avoiding excessive REST polling.

**References:**

- https://docs.deribit.com/articles/market-data-collection-best-practices
- https://docs.deribit.com/api-reference/subscription-management/public-subscribe

## R-12 — News and macro

**Decision:** Keep event risk as a separate bounded-context adapter.

Priority:

1. Official release calendars and release pages.
2. Official agency feeds/RSS.
3. Licensed/reputable news metadata provider.
4. Web search in the ChatGPT Project as a fallback, clearly outside MCP completeness.

The MCP should not scrape arbitrary web pages without explicit maintenance and licensing review.

## R-13 — ChatGPT app refresh

**Decision:** After tool/schema changes, refresh actions in the draft/published app or recreate/republish where the workspace plan requires it. ChatGPT does not automatically enable all server-side tool changes.

**Reference:** https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta


---

<!-- EMBEDDED SECTION: data-model.md -->

# Data Model

All timestamps are UTC ISO-8601 strings at the MCP boundary. Internal storage may use epoch milliseconds or database timestamps.

## 1. SourceRef

```ts
interface SourceRef {
  provider: string;
  venue: string;
  instrument: string;
  marketType: "spot" | "perpetual" | "option" | "macro" | "news";
  endpointOrChannel?: string;
  sourceTimestamp: string;
  receivedAt: string;
  ageMs: number;
  status: "live" | "delayed" | "stale" | "partial" | "unavailable";
  fallbackUsed: boolean;
  fallbackFrom?: string;
  warnings: string[];
}
```

## 2. Candle

```ts
interface Candle {
  openTime: string;
  closeTime: string;
  timeframe: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "1d";
  open: number;
  high: number;
  low: number;
  close: number;
  baseVolume: number;
  quoteVolume?: number;
  tradeCount?: number;
  takerBuyBaseVolume?: number;
  takerBuyQuoteVolume?: number;
  isClosed: boolean;
  source: SourceRef;
}
```

Uniqueness key: `(venue, instrument, marketType, timeframe, openTime)`.

## 3. IndicatorValue

```ts
interface IndicatorValue {
  name: "EMA20" | "EMA50" | "EMA200" | "RSI14" | "ATR14" | "ADX14" |
        "PLUS_DI14" | "MINUS_DI14" | "MACD_LINE" | "MACD_SIGNAL" | "MACD_HISTOGRAM";
  timeframe: string;
  barOpenTime: string;
  value: number | null;
  previousValue: number | null;
  warmupComplete: boolean;
  closedBarOnly: true;
  calculationVersion: string;
}
```

## 4. SessionVwap

```ts
interface SessionVwap {
  profile: "UTC_DAY" | "ASIA" | "EUROPE" | "US" | string;
  startTime: string;
  endTime: string;
  valueUsd: number | null;
  currentPriceUsd: number;
  deviationPct: number | null;
  position: "above" | "below" | "neutral" | "unavailable";
  method: "quote_over_base" | "typical_price_approximation";
  candleCount: number;
  completeFromAnchor: boolean;
  source: SourceRef;
}
```

## 5. SwingPoint and MarketStructure

```ts
interface SwingPoint {
  type: "high" | "low";
  timeframe: "1h" | "4h";
  priceUsd: number;
  barOpenTime: string;
  confirmedAt: string;
  method: "pivot_2x2";
  atrDistance?: number;
}

interface MarketStructure {
  timeframe: "1h" | "4h";
  state: "HH_HL" | "LH_LL" | "mixed" | "insufficient";
  swings: SwingPoint[];
  confirmedOnly: true;
}
```

## 6. TrendState

```ts
interface TrendState {
  classification: "bullish_trend" | "bearish_trend" | "range" | "transition" | "insufficient";
  batsCode: "T" | "R" | "X";
  confidence: number;
  emaAlignment1h: string;
  adx14_1h: number | null;
  structure1h: string;
  structure4h: string;
  evidence: string[];
  calculationVersion: string;
}
```

## 7. VolatilityRegime

```ts
interface VolatilityRegime {
  currentDailyAtr14Usd: number | null;
  meanDailyAtr14_20: number | null;
  ratio: number | null;
  classification: "high" | "normal" | "low" | "insufficient";
  batsCode: "H" | "N" | "L" | "X";
  intradayAtrPct: Record<string, number | null>;
  calculationVersion: string;
}
```

## 8. ReferenceLevels

```ts
interface ReferenceLevels {
  convention: "UTC" | string;
  priorDayHigh: number | null;
  priorDayLow: number | null;
  priorDayClose: number | null;
  currentWeekOpen: number | null;
  asiaHigh: number | null;
  asiaLow: number | null;
  europeHigh: number | null;
  europeLow: number | null;
  usHigh: number | null;
  usLow: number | null;
  recent1hSwings: SwingPoint[];
  recent4hSwings: SwingPoint[];
}
```

## 9. OpenInterestSnapshot and changes

```ts
interface OpenInterestSnapshot {
  venue: string;
  instrument: string;
  timestamp: string;
  openInterestBtc: number | null;
  openInterestUsd: number | null;
  markPriceUsd: number;
}

interface OpenInterestChange {
  requestedWindow: "5m" | "15m" | "1h" | "4h" | "24h";
  actualElapsedMs: number | null;
  startTimestamp: string | null;
  endTimestamp: string;
  startBtc: number | null;
  endBtc: number | null;
  absoluteBtc: number | null;
  percent: number | null;
  coverageComplete: boolean;
}
```

## 10. LiquidationEvent and aggregate

```ts
interface LiquidationEvent {
  eventId: string;
  venue: string;
  instrument: string;
  sideLiquidated: "long" | "short";
  priceUsd: number;
  quantityBtc: number;
  notionalUsd: number;
  eventTime: string;
  receivedAt: string;
}

interface LiquidationAggregate {
  window: "5m" | "15m" | "1h";
  longLiquidationUsd: number | null;
  shortLiquidationUsd: number | null;
  totalLiquidationUsd: number | null;
  eventCount: number | null;
  largestLiquidationUsd: number | null;
  lastEventAt: string | null;
  venuesCovered: string[];
  globalCoverage: false;
  collectorConnected: boolean;
  coverageStartAt: string | null;
  status: "live" | "partial" | "stale" | "unavailable";
}
```

## 11. OptionsSurface

```ts
interface OptionsExpirySummary {
  expiry: string;
  daysToExpiry: number;
  forwardUsd?: number;
  atmIv?: number;
  call25DeltaIv?: number;
  put25DeltaIv?: number;
  riskReversal25?: number;
  butterfly25?: number;
  totalOpenInterestBtc?: number;
}

interface OptionsSurface {
  venue: "Deribit";
  status: "live" | "stale" | "partial" | "unavailable";
  asOf: string | null;
  ageMs: number | null;
  expiries: OptionsExpirySummary[];
  staleReason?: string;
  source: SourceRef;
}
```

## 12. MacroEvent and NewsItem

```ts
interface MacroEvent {
  id: string;
  name: string;
  agency: string;
  scheduledTimeUtc: string;
  scheduledTimeMyt: string;
  importance: "high" | "medium" | "low";
  status: "scheduled" | "released" | "revised" | "cancelled";
  actual?: number | string;
  consensus?: number | string;
  previous?: number | string;
  surprise?: number;
  sourceUrl?: string;
  source: SourceRef;
}

interface NewsItem {
  id: string;
  headline: string;
  publishedAt: string;
  publisher: string;
  category: string;
  materiality: "high" | "medium" | "low";
  verifiedOfficial: boolean;
  sourceUrl?: string;
}
```

## 13. QualityGate

```ts
interface QualityGate {
  executionCriticalComplete: boolean;
  regimeCriticalComplete: boolean;
  strategySpecificComplete: {
    C1LiquidationReversal: boolean;
    optionsContext: boolean;
    derivativesContext: boolean;
    eventRisk: boolean;
  };
  optionalContextComplete: boolean;
  missingFields: string[];
  staleFields: string[];
  unavailableFields: string[];
  warnings: string[];
  sectionSkewMs: number;
  completeness: "complete" | "core_complete" | "partial" | "insufficient";
}
```

## 14. BatsContext

```ts
interface BatsContext {
  schemaVersion: string;
  calculationVersion: string;
  asOf: string;
  market: "BTC";
  spot: object;
  candles: Record<string, Candle[]>;
  indicators: Record<string, IndicatorValue[]>;
  marketState: {
    trend: TrendState;
    volatility: VolatilityRegime;
    vwap: SessionVwap[];
    session: string;
    code: string;
  };
  structure: Record<string, MarketStructure>;
  levels: ReferenceLevels;
  perpetual: object;
  oiChanges: OpenInterestChange[];
  liquidations: LiquidationAggregate[];
  options: OptionsSurface;
  eventRisk: { events: MacroEvent[]; news: NewsItem[] };
  quality: QualityGate;
}
```


---

<!-- FILE: docs/bats-market-intelligence/plan.md -->

# Implementation Plan: BATS Market Intelligence

**Feature name:** `bats-market-intelligence`  
**Repository path:** `docs/bats-market-intelligence`  
**Status:** Proposed  

## 1. Architectural approach

Transform the service from request-time snapshot assembly into four cooperating layers:

```text
Provider adapters / WebSocket collectors
             ↓
Normalized market-data domain
             ↓
Durable history + rolling cache
             ↓
Deterministic feature engine
             ↓
MCP contract/presentation layer
```

### Layer A — Providers

Logical components:

- `CandleProvider`
- `PerpetualProvider`
- `LiquidationProvider`
- `OptionsProvider`
- `MacroEventProvider`
- `NewsProvider`

Each adapter returns normalized domain objects and a `SourceRef`. No provider-specific payload may leak directly into feature calculations.

### Layer B — Storage

- Durable SQL/time-series repository for candles, OI/funding snapshots, feature snapshots, events and audit data.
- Redis/Upstash for current caches, singleflight locks, rolling liquidation events and options surfaces.
- Repository interfaces permit local/in-memory implementations for unit tests.

### Layer C — Feature engine

Pure functions:

- indicator calculations;
- trend classification;
- ATR regime;
- session VWAP;
- swing confirmation;
- reference levels;
- BATS quality gate.

The feature engine accepts normalized arrays and emits versioned deterministic values.

### Layer D — MCP tools

- Existing tool handlers remain thin orchestration wrappers.
- New tools expose output schemas and structured results.
- Partial upstream failures are represented inside quality sections.
- `get_btc_bats_context` runs independent sections concurrently with bounded timeouts.

## 2. Provisional source-tree layout

The SDD artifacts for this feature live at `docs/bats-market-intelligence`. The application tree below is a logical target only; `T000` must map it to the real repository stack.

```text
docs/
  bats-market-intelligence/
    Intraday_MCP_BATS_SDD.md
    spec.md
    plan.md
    tasks.md
    mcp-tools.yaml
    acceptance-tests.md
src/
  domain/
    market-data.*
    quality.*
    bats-context.*
  providers/
    binance/
    hyperliquid/
    deribit/
    liquidations/
    macro/
    news/
  storage/
    candles-repository.*
    derivatives-repository.*
    event-repository.*
    redis-cache.*
  features/
    ema.*
    rsi.*
    macd.*
    atr-adx.*
    vwap.*
    structure.*
    market-state.*
    reference-levels.*
  collectors/
    oi-collector.*
    liquidation-worker.*
    deribit-options-worker.*
  services/
    bats-context-service.*
    market-history-service.*
    event-risk-service.*
  mcp/
    tools.*
    schemas.*
  observability/
    metrics.*
    health.*
tests/
  unit/
  contract/
  integration/
  fixtures/
```

## 3. Data flow

### Request path

1. Tool validates input.
2. Context service resolves requested sections.
3. Fresh cache is used where valid.
4. Missing/stale core data triggers bounded refresh or historical fetch.
5. Feature engine calculates from closed, gap-checked candles.
6. Supplemental sections run concurrently and may degrade independently.
7. Quality gate classifies completeness.
8. Output is validated against its output schema.
9. Structured content and compatibility text are returned.

### Collector path

1. Persistent workers connect to OI/liquidation/options sources.
2. Messages are normalized and deduplicated.
3. Current state is cached.
4. Historical snapshots/events are persisted.
5. Heartbeats and coverage metadata are updated.
6. Reconnect uses backoff and jitter.

## 4. Core calculation details

### Candle validation

Reject or warn on:

- non-finite OHLCV;
- high below open/close/low;
- low above open/close/high;
- duplicate open times;
- interval discontinuity;
- future close times beyond tolerance.

### Indicator warm-up

Fetch at least 300 bars for timeframes requiring EMA200. Do not emit a false zero/default if warm-up is incomplete; return `null` and `warmupComplete=false`.

### VWAP

Require complete coverage from anchor. If history starts after anchor, return the value as partial and `completeFromAnchor=false`; it cannot satisfy execution-critical VWAP confirmation.

### Section skew

Calculate maximum difference between source timestamps used by core sections. If skew exceeds a configurable threshold, downgrade core quality.

## 5. Resilience

- Provider timeout per call.
- Total context deadline.
- Exponential backoff with jitter.
- Circuit breakers per provider/endpoint.
- Request coalescing/singleflight.
- Last-known-good caches with explicit stale metadata.
- Fallback providers with venue labels preserved.
- Reconciliation jobs for candle/OI gaps.

## 6. Security

- Store credentials in deployment secrets.
- Redact auth headers and tokens.
- Cap user-controlled limits and lookback windows.
- Validate all provider payloads.
- Restrict outbound domains where platform permits.
- Review licensing and redistribution terms for every news/liquidation provider.

## 7. Observability

Metrics:

- `provider_request_total{provider,status}`
- `provider_rate_limit_total{provider}`
- `provider_circuit_state{provider}`
- `data_age_ms{section,venue}`
- `collector_connected{collector,venue}`
- `collector_lag_ms{collector,venue}`
- `cache_hit_total{cache,section}`
- `feature_duration_ms{feature,timeframe}`
- `tool_duration_ms{tool}`
- `context_completeness_total{level}`
- `schema_validation_failure_total{tool}`

Structured logs include request ID, tool, source timestamps and missing fields, but no secrets.

## 8. Migration and rollout

### Stage 0 — Source audit

Map actual modules, runtime, deployment platform, package manager, test framework and persistence facilities.

### Stage 1 — Core history and features behind flags

Deploy new providers/storage/features without exposing new tools. Compare calculations against offline fixtures.

### Stage 2 — New tools in developer mode

Expose `get_btc_market_history` and `get_btc_bats_features`; validate output schemas and latency.

### Stage 3 — Derivatives collectors

Enable OI history and liquidation pipeline. Keep options optional.

### Stage 4 — Consolidated context

Expose `get_btc_bats_context`, retain current `get_btc_report_context`.

### Stage 5 — Event risk

Enable official macro sources, then optional reputable news integration.

### Stage 6 — ChatGPT action refresh

Refresh app actions and review schema diffs. New actions remain disabled until tested. Recreate/republish if required by the workspace plan.

## 9. Repository integration

- Store all feature documents under `docs/bats-market-intelligence`.
- Use a feature branch such as `feat/bats-market-intelligence`.
- Review the six-document diff before committing.
- Suggested commit subject: `docs: add bats-market-intelligence SDD`.
- Push the feature branch and open a pull request before implementation begins.

## 10. Rollback

- Disable new tools via feature flags.
- Keep existing seven tool implementations untouched or route them to legacy services.
- Preserve database migrations as additive wherever possible.
- Do not delete cached/legacy keys during initial rollout.
- Revert calculation version independently from tool schema where possible.


---

<!-- FILE: docs/bats-market-intelligence/tasks.md -->

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


---

<!-- FILE: docs/bats-market-intelligence/acceptance-tests.md -->

# Acceptance Tests: BATS Market Intelligence

**Feature name:** `bats-market-intelligence`  
**Repository path:** `docs/bats-market-intelligence`  

## AT-001 — Complete core context

**Given** all core candle providers and storage are healthy  
**When** `get_btc_bats_context` is called with defaults  
**Then** it returns closed data for 5m/15m/1h/4h/1d, complete indicators, trend, ATR regime, session VWAP, structure and reference levels  
**And** `quality.executionCriticalComplete=true`  
**And** `quality.regimeCriticalComplete=true`.

## AT-002 — Options outage is optional

**Given** core data is healthy and Deribit is rate limited  
**When** context is requested  
**Then** the options section is `stale` if a last-known-good cache exists, otherwise `unavailable`  
**And** the source timestamp and stale reason are returned  
**And** `executionCriticalComplete=true`  
**And** `optionalContextComplete=false`.

## AT-003 — Liquidation collector unavailable

**Given** Redis credentials or the liquidation collector are unavailable  
**When** context is requested  
**Then** liquidation windows return `unavailable` with collector metadata  
**And** `strategySpecificComplete.C1LiquidationReversal=false`  
**And** core completeness is not automatically downgraded.

## AT-004 — Session VWAP partial anchor

**Given** the earliest available candle begins after the configured session anchor  
**When** VWAP is calculated  
**Then** the result includes `completeFromAnchor=false`  
**And** the VWAP field cannot satisfy execution-critical completeness.

## AT-005 — Open candle exclusion

**Given** a current 15m candle is still open  
**When** features are calculated  
**Then** RSI/MACD/EMA/ATR/ADX and PA confirmation use the latest closed candle only  
**And** the open candle may be returned only with `isClosed=false`.

## AT-006 — Indicator reproducibility

**Given** an identical normalized candle fixture and calculation version  
**When** the feature engine runs twice  
**Then** all indicator and classification outputs are equal.

## AT-007 — EMA warm-up incomplete

**Given** fewer than 200 valid candles  
**When** EMA200 is requested  
**Then** EMA200 is null  
**And** `warmupComplete=false`  
**And** no bullish/bearish trend classification requiring EMA200 is emitted.

## AT-008 — Historical gap

**Given** a missing 1h candle in the historical sequence  
**When** features are calculated  
**Then** the gap is reported  
**And** affected features are marked partial or insufficient according to configured tolerance  
**And** the missing interval is not silently interpolated.

## AT-009 — OI lookback coverage

**Given** only 42 minutes of OI history exists  
**When** 1h and 4h changes are requested  
**Then** both return `coverageComplete=false`  
**And** the actual elapsed interval is returned  
**And** no 1h/4h percentage is fabricated.

## AT-010 — Venue labeling

**Given** spot candles come from Binance Spot and perpetual context comes from Hyperliquid  
**When** basis is calculated  
**Then** both venue labels and timestamps are returned  
**And** the value is identified as cross-venue calculated basis.

## AT-011 — Provider rate limit

**Given** an upstream returns HTTP 429 with Retry-After  
**When** refresh is attempted  
**Then** the service respects Retry-After, opens/updates the circuit and does not loop aggressively  
**And** returns a stale cache or unavailable field with reason.

## AT-012 — Liquidation deduplication

**Given** the same venue event is delivered twice  
**When** the collector writes events  
**Then** the aggregate counts and notional include it once.

## AT-013 — Non-global coverage

**Given** only one liquidation venue is connected  
**When** aggregate data is returned  
**Then** `globalCoverage=false` and `venuesCovered` contains only that venue.

## AT-014 — Prior-day and week conventions

**Given** UTC daily/weekly candles around midnight and Monday boundaries  
**When** levels are calculated  
**Then** prior-day H/L/C and weekly open match the UTC convention exactly.

## AT-015 — Transition market state

**Given** mixed EMA alignment, ADX between 20 and 25 and inconsistent structure  
**When** trend is classified  
**Then** the state is `transition`, BATS code `X`, not forced `T` or `R`.

## AT-016 — Schema conformance

**Given** each new MCP tool response  
**When** validated against its declared output schema  
**Then** validation succeeds for live, stale, partial and unavailable fixtures.

## AT-017 — Existing tool compatibility

**Given** pre-enhancement contract fixtures for the seven existing tools  
**When** the enhanced release is tested  
**Then** required existing fields and accepted input values remain valid.

## AT-018 — Event-risk time conversion

**Given** a scheduled event with official UTC/ET time  
**When** event risk is returned  
**Then** the UTC and Asia/Kuala_Lumpur timestamps represent the same instant and account for source-zone DST.

## AT-019 — Comprehensive context deadline

**Given** an optional provider hangs beyond its timeout  
**When** context is requested  
**Then** the core response completes within the total deadline  
**And** the optional section is marked unavailable/timeout.

## AT-020 — No trading output

**Given** any MCP request  
**When** the service responds  
**Then** it contains market data, features and quality metadata only  
**And** no instruction to buy, sell, leverage or place an order is generated by the MCP.

## AT-021 — Documentation package placement

**Given** the SDD archive is extracted at the repository root  
**When** the package is inspected  
**Then** the six requested files exist directly under `docs/bats-market-intelligence`  
**And** all feature identifiers and internal path references use `bats-market-intelligence`  
**And** `mcp-tools.yaml` parses as valid YAML.


---

<!-- EMBEDDED SECTION: checklists/requirements.md -->

# Requirements and Release Checklist

## Source audit

- [ ] Repository contents were actually reviewed.
- [ ] Existing seven tool handlers and service paths are documented.
- [ ] Runtime, package manager, deployment and test commands are known.
- [ ] Current provider and cache behavior is mapped.

## Core data

- [ ] 5m/15m/1h/4h/1d closed history returns at least 300 candles where available.
- [ ] Gaps, duplicates and open bars are identified.
- [ ] EMA20/50/200, RSI14, MACD, ATR14 and ADX14 pass golden tests.
- [ ] Calculation version is returned.
- [ ] Session VWAP returns anchor and method.
- [ ] Trend can return transition/insufficient instead of forcing T/R.
- [ ] ATR regime follows the documented daily convention.
- [ ] Prior-day/week/session levels use explicit time boundaries.

## Derivatives

- [ ] OI snapshots are persisted.
- [ ] OI changes include coverage and actual elapsed time.
- [ ] Funding and basis identify venues.
- [ ] No single venue is described as global.

## Liquidations

- [ ] Redis is configured securely.
- [ ] Collector runs independently from MCP request handlers.
- [ ] Reconnect/backoff/heartbeat are tested.
- [ ] Events are deduplicated.
- [ ] Coverage metadata is returned.
- [ ] C1 completeness degrades independently.

## Options

- [ ] Deribit uses WebSocket/streaming for live data.
- [ ] Subscription universe is bounded.
- [ ] REST polling is not performed per user request.
- [ ] 429 handling, circuit breaker and stale cache are tested.
- [ ] Options outage does not fail core context.

## Events and news

- [ ] Official macro sources are configured.
- [ ] UTC/MYT time conversion is tested through DST changes.
- [ ] Actual/consensus/previous fields retain provenance.
- [ ] News licensing/terms are approved.
- [ ] Official facts and interpretation are separated.

## MCP contracts

- [ ] New tools have input and output schemas.
- [ ] Structured results conform to output schemas.
- [ ] Tools are annotated read-only where supported.
- [ ] Existing tools pass backward-compatibility tests.
- [ ] Partial data uses field-level statuses.
- [ ] Comprehensive quality gate is present.

## Operations

- [ ] Provider, cache, collector, calculation and completeness metrics exist.
- [ ] Secrets are redacted.
- [ ] Rate limits and provider terms are documented.
- [ ] Cached and refresh latency targets pass.
- [ ] Canary and rollback procedures are tested.
- [ ] ChatGPT app actions are refreshed/reviewed after deployment.


---

<!-- EMBEDDED SECTION: quickstart.md -->

# Implementation Quickstart

Replace command placeholders after `T000` identifies the repository's actual runtime, package manager and test commands.

## 1. Create a feature branch

```bash
git checkout -b feat/bats-market-intelligence
```

## 2. Establish baseline

```bash
# Use the repository's real commands discovered in T000
<install-command>
<lint-command>
<typecheck-command>
<test-command>
```

Capture `tools/list` and representative responses for all existing tools before changing schemas.

## 3. Configure development services

Minimum environment contract:

```dotenv
# Core providers
BINANCE_BASE_URL=
HYPERLIQUID_INFO_URL=https://api.hyperliquid.xyz/info

# Durable storage
DATABASE_URL=

# Rolling cache / liquidation storage
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Deribit
DERIBIT_WS_URL=wss://www.deribit.com/ws/api/v2
DERIBIT_CLIENT_ID=
DERIBIT_CLIENT_SECRET=

# Optional macro/news providers
MACRO_PROVIDER_ENABLED=true
NEWS_PROVIDER_API_KEY=

# Feature flags
FEATURE_MARKET_HISTORY=false
FEATURE_BATS_FEATURES=false
FEATURE_DERIVATIVES_HISTORY=false
FEATURE_LIQUIDATION_COLLECTOR=false
FEATURE_OPTIONS_STREAM=false
FEATURE_EVENT_RISK=false
FEATURE_BATS_CONTEXT=false
```

Keep all secrets server-side. Do not return them from health diagnostics.

## 4. Develop in vertical slices

Recommended first slice:

1. Historical candles for one provider.
2. Normalization and validation.
3. EMA/RSI/MACD/ATR/ADX.
4. `get_btc_market_history` and `get_btc_bats_features`.
5. Golden and contract tests.

This slice independently resolves most `DATA INSUFFICIENT` outcomes.

## 5. Run MCP contract inspection

Use the MCP inspector or the repository's existing test client to verify:

- tool discovery;
- input schemas;
- output schemas;
- structured content;
- read-only annotations;
- partial-data responses.

Example prompts/tests:

```text
Call get_btc_market_history for 5m,15m,1h,4h,1d with 300 closed candles.
Call get_btc_bats_features and show quality only.
Call get_btc_bats_context with options disabled.
```

## 6. Validate feature vectors

Maintain fixtures with known expected outputs. At minimum:

- monotonic rise;
- monotonic decline;
- flat market;
- gaps and duplicates;
- extreme volatility;
- insufficient warm-up;
- session crossing midnight UTC.

## 7. Enable collectors

Run OI, liquidation and options collectors as separate worker processes or durable scheduled/streaming services. Do not rely on a ChatGPT request to keep a WebSocket alive.

## 8. Canary deployment

1. Deploy with all new tools/features disabled.
2. Enable history/features internally.
3. Compare production legacy and enhanced context.
4. Enable `get_btc_bats_context` for selected testers.
5. Observe completeness, stale use, p95 latency and provider errors.
6. Refresh ChatGPT app actions and review diffs.

## 9. Project instruction update

After deployment, update the ChatGPT Project to use:

```text
For START and CHECK, call get_btc_bats_context first.
Treat executionCriticalComplete=false as DATA INSUFFICIENT.
Treat missing liquidations as disabling C1 only.
Treat missing options as optional context only.
Never infer closed-candle indicators that the MCP did not return.
```


---

<!-- EMBEDDED SECTION: implementation-notes.md -->

# Implementation Notes and Pseudocode

## 1. Candle normalization

```pseudo
normalizeCandle(raw, venue, marketType, timeframe):
  candle = parse numeric fields strictly
  assert finite(candle.open/high/low/close/volume)
  assert high >= max(open, close, low)
  assert low <= min(open, close, high)
  candle.isClosed = now > closeTime + closeTolerance
  return candle with SourceRef
```

## 2. Closed series

```pseudo
closed = candles
  .filter(isClosed)
  .sort(openTime ascending)
  .deduplicate(venue, instrument, marketType, timeframe, openTime)
validateIntervalContinuity(closed)
```

## 3. EMA

```pseudo
seed = SMA(first period values)
ema[period-1] = seed
alpha = 2 / (period + 1)
for i from period to end:
  ema[i] = alpha * value[i] + (1 - alpha) * ema[i-1]
```

## 4. Wilder RSI

```pseudo
changes = diff(close)
gain = max(change, 0)
loss = abs(min(change, 0))
avgGain = SMA(first period gains)
avgLoss = SMA(first period losses)
for next:
  avgGain = ((avgGain * (period - 1)) + gain) / period
  avgLoss = ((avgLoss * (period - 1)) + loss) / period
RS = avgGain / avgLoss
RSI = 100 - 100 / (1 + RS)
```

Handle zero loss as RSI 100 and zero gain/loss as policy-defined neutral 50; lock this in tests.

## 5. ATR and ADX

```pseudo
TR = max(high-low, abs(high-prevClose), abs(low-prevClose))
ATR = Wilder(TR, 14)
plusDM = high-prevHigh if greater than prevLow-low and positive else 0
minusDM = prevLow-low if greater than high-prevHigh and positive else 0
plusDI = 100 * Wilder(plusDM,14) / ATR
minusDI = 100 * Wilder(minusDM,14) / ATR
DX = 100 * abs(plusDI-minusDI) / (plusDI+minusDI)
ADX = Wilder(DX,14)
```

## 6. Session VWAP

```pseudo
sessionCandles = candles where openTime >= anchorStart and openTime <= asOf
if all quoteVolume available:
  vwap = sum(quoteVolume) / sum(baseVolume)
  method = quote_over_base
else:
  vwap = sum(typicalPrice * baseVolume) / sum(baseVolume)
  method = typical_price_approximation
completeFromAnchor = firstCandle.openTime == expectedAnchorFirstBar
```

## 7. Pivot structure

```pseudo
for i in 2 .. len-3:
  swingHigh if high[i] > highs[i-2:i] and high[i] > highs[i+1:i+3]
  swingLow  if low[i]  < lows[i-2:i]  and low[i]  < lows[i+1:i+3]
confirmedAt = closeTime[i+2]
```

Optionally reject adjacent swings whose distance is below a configurable ATR multiple.

## 8. Market-state classification

```pseudo
if warmup incomplete or structure insufficient:
  state = insufficient
else if ema20 > ema50 > ema200 and close > ema20 and adx >= 25 and structure in [HH_HL]:
  state = bullish_trend
else if ema20 < ema50 < ema200 and close < ema20 and adx >= 25 and structure in [LH_LL]:
  state = bearish_trend
else if adx <= 20 and structure == mixed:
  state = range
else:
  state = transition
```

## 9. OI sampling and changes

```pseudo
on schedule every minute:
  snapshot = provider.getCurrentOI()
  repository.upsert(snapshot unique by venue+instrument+timestampBucket)

change(window):
  end = latest snapshot
  target = end.timestamp - window
  start = nearest snapshot at-or-before target within tolerance
  if absent: coverageComplete=false
  else percent = (end.btc/start.btc - 1) * 100
```

## 10. Liquidation storage

Redis sorted set:

```text
key: liquidations:BTC:events
score: eventTimeEpochMs
member: compact normalized JSON or event ID with hash payload
```

Dedup key:

```text
liquidations:dedup:<venue>:<eventId> TTL 72h
```

Aggregation uses score ranges and returns exact covered venues.

## 11. Deribit singleflight and stale cache

```pseudo
getOptionsSurface():
  cached = cache.get(surface)
  if cached fresh: return live cache
  if refresh already in flight: await bounded shared promise
  try refresh via stream/current state
  catch rateLimit:
    circuit.recordFailure()
    if cached exists: return cached with status=stale
    return unavailable
```

## 12. Quality gate

```pseudo
executionCritical =
  closedCandlesComplete(15m,1h) and
  momentumIndicatorAvailable and
  sessionVwap.completeFromAnchor and
  stopReferenceLevelsAvailable

regimeCritical =
  ema200Warm and adxAvailable and dailyAtrRegimeAvailable and structure4hAvailable

strategySpecific.C1 = liquidations.live_or_partial_with_coverage
optionalContext = options.available and eventRisk.available and news.available
```

The exact Project-side trade requirements remain outside the MCP. The MCP reports data readiness only.
