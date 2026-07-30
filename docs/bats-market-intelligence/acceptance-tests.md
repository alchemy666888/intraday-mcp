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
