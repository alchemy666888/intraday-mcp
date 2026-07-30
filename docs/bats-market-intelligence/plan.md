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
