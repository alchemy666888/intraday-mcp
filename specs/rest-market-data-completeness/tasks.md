# Tasks: REST Market Data Completeness

Status: Approved

## Execution rules

- Execute tasks in dependency order in one implementation PR.
- Use focused commits/checkpoints aligned with completed task groups when the worktree permits.
- Do not mark a task Completed until every listed verification succeeds.
- Record implementation notes, deviations, and exact verification results without rewriting the
  approved requirements, design, or task intent.
- Keep all provider calls REST-only and request-driven. Do not add WebSockets, workers, cron,
  Redis, PostgreSQL, any other database, durable cache, or paid storage.
- Preserve unrelated user changes and all twelve existing MCP tools.
- Use deterministic mocked provider fixtures in automated tests; never run live-provider checks
  in CI. Live checks are opt-in through the dedicated smoke command only.
- Stop and return to specification review if implementation requires a new environment variable,
  public tool, persistent state, provider, or incompatible contract change.
- `Status: APPROVE` on a task means its scope is approved but has not yet been executed; the
  implementation workflow changes that task to In Progress and then Completed.

## Task list

### TASK-001 — Establish configuration and contract guardrails

Status: Completed

Requirements: REQ-F-002, REQ-F-020, REQ-F-023, REQ-F-024, REQ-NF-004, REQ-NF-005,
REQ-NF-006

Design: DES-001, DES-014

Dependencies: None

Expected file or component changes:

- `src/config/env.ts` — add and validate only the three approved direct-provider variables.
- `src/domain/market-data.ts` or a focused direct-provider domain module — define shared provider,
  cache, freshness, provenance, and section-plan types without changing public tool inputs.
- `test/unit/env.test.ts` — cover defaults, bounds, optional key/override, and bearer compatibility.
- `test/unit/tool-contract.test.ts` — capture the baseline twelve tool names, inputs, defaults,
  and required existing response keys for later additive checks.

Steps:

1. Run the current test, typecheck, and tool-registration baseline and record any pre-existing
   failures before modification.
2. Add optional `COINALYZE_API_KEY`, optional `COINALYZE_LIQUIDATION_SYMBOLS`, and
   `DIRECT_PROVIDER_TIMEOUT_MS` with default 4000ms and accepted range 500–4000ms.
3. Keep the key optional at startup and preserve the existing bearer validation behavior.
4. Add shared TypeScript types for provider envelopes, field provenance, cache status, safe
   failure, freshness, and internal section plans.
5. Add tests proving no credential is required for startup or non-liquidation contracts and no
   fourth environment variable is introduced.

Verification:

- `node --test --import tsx test/unit/env.test.ts test/unit/tool-contract.test.ts`
- `npm run typecheck`
- `test "$(rg -n 'COINALYZE_API_KEY|COINALYZE_LIQUIDATION_SYMBOLS|DIRECT_PROVIDER_TIMEOUT_MS' src/config/env.ts | wc -l)" -ge 3`

Completion criteria:

- Configuration accepts exactly the approved additions, the Coinalyze key remains optional and
  server-only, shared internal contracts compile, and the twelve-tool baseline is recorded.

Implementation notes:

- Preflight on 2026-08-02 confirmed the 15-second MCP route limit, no database/storage runtime
  dependency or environment variable, and the pre-enhancement source/version baseline.
- Preflight blocker resolved on 2026-08-02 by regenerating the incomplete npm lockfile from the
  existing exact `package.json` versions without adding dependencies. `npm ci --ignore-scripts`,
  `npm test` (23 passed), `npm run typecheck`, and `npm run lint` all passed. The provided GitHub
  repository was configured as `origin`; TASK-001 remains approved and unstarted.

### TASK-002 — Replace the singleton cache with bounded keyed ephemeral state

Status: Completed

Requirements: REQ-F-022, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-004, REQ-NF-010

Design: DES-002

Dependencies: TASK-001

Expected file or component changes:

- `src/cache/ephemeral-cache.ts` — implement keyed provider entries, 64-entry eviction,
  stale-if-error access, in-flight deduplication, safe diagnostics, and test reset.
- `src/clients/market-data-client.ts` — migrate the existing canonical cache call sites to an
  explicit upstream key without changing their external behavior.
- `test/unit/ephemeral-cache.test.ts` — cover isolation, TTL, eviction, dedupe, failure cleanup,
  stale access, and reset.

Steps:

1. Replace the single module entry with a maximum-64-entry map keyed by provider, operation, and
   normalized request shape.
2. Evict expired entries first and then least-recently-used entries when the cap is reached.
3. Keep in-flight promises in a separate keyed map and delete them in `finally` after success or
   failure.
4. Ensure failed refreshes do not overwrite an eligible prior success entry.
5. Expose only safe timestamps, cache states, counts, and provider identifiers to diagnostics.
6. Add a reset function used only by deterministic tests; process restart must remain a valid
   full reset.

Verification:

- `node --test --import tsx test/unit/ephemeral-cache.test.ts`
- `npm run typecheck`
- `rg -n 'MAX_ENTRIES|64|finally' src/cache/ephemeral-cache.ts`

Completion criteria:

- Distinct providers and inputs never collide, concurrent equivalent calls deduplicate, the map
  never exceeds 64 entries, and all state remains disposable process memory.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-003 — Implement the shared safe provider HTTP policy

Status: Completed

Requirements: REQ-F-008, REQ-F-011, REQ-F-021, REQ-NF-001, REQ-NF-002, REQ-NF-003,
REQ-NF-005, REQ-NF-007, REQ-NF-009

Design: DES-003, DES-020

Dependencies: TASK-001, TASK-002

Expected file or component changes:

- `src/clients/provider-http.ts` — add injected fetch/clock/sleeper, total deadline, one-retry
  policy, `Retry-After` handling, bounded parsing, and safe provider errors.
- `src/utils/errors.ts` — add stable direct-provider error codes without raw response data.
- `test/unit/provider-http.test.ts` — cover success, network/5xx retry, 401, 429, 451, timeout,
  malformed/oversized JSON, abort cleanup, and redaction.

Steps:

1. Implement one total operation deadline from `DIRECT_PROVIDER_TIMEOUT_MS`; every attempt and
   retry wait must fit inside it.
2. Permit at most one retry for transient network/5xx failure. Never retry 400/401/403/404/451.
3. Parse delta-seconds or HTTP-date `Retry-After` and retry 429 at most once only when time remains.
4. Bound response bytes before schema parsing and map failures to stable safe codes/status.
5. Keep credentials out of URLs, cache keys, error text, logs, and structured diagnostic output.
6. Make fetch, time, and sleep injectable so automated tests perform no real wait or network call.

Verification:

- `node --test --import tsx test/unit/provider-http.test.ts`
- `npm run typecheck`
- `npm run lint`

Completion criteria:

- All provider clients can share one tested REST policy that aborts by four seconds, retries only
  as approved, honors bounded 429 delays, and cannot expose a secret or raw body.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-004 — Add Coinalyze liquidation discovery and deterministic aggregation

Status: Completed

Requirements: REQ-F-002, REQ-F-003, REQ-F-004, REQ-F-005, REQ-F-006, REQ-F-007,
REQ-F-008, REQ-F-022, REQ-NF-002, REQ-NF-003, REQ-NF-005, REQ-NF-007, REQ-NF-010

Design: DES-004, DES-005

Dependencies: TASK-002, TASK-003

Expected file or component changes:

- `src/clients/coinalyze-client.ts` — implement catalog/history REST calls, allowlisted selection,
  override validation, 15-minute catalog cache, 60-second result cache, and local weighted budget.
- `src/features/liquidations.ts` — normalize buckets and aggregate exact 5m/15m/1h values.
- `src/schemas/coinalyze.ts` — validate supported markets and liquidation-history payloads.
- `test/unit/coinalyze-client.test.ts` — cover authentication, catalog/override selection, budget,
  rate limits, stale data, and safe failure.
- `test/unit/liquidations.test.ts` — cover exact sums, duplicates, ordering, gaps, future rows,
  legitimate zeros, and unsupported event metadata.

Steps:

1. Send `COINALYZE_API_KEY` only in the `api_key` header and return `missing_api_key` without a
   request when absent.
2. Fetch/cache `future-markets`, filter BTC perpetuals, map the ordered seven-exchange allowlist,
   and select no more than eight supported symbols.
3. Parse, trim, deduplicate, and catalog-validate the optional override; expose requested,
   included, excluded, and symbol/venue mappings.
4. Reserve symbol-weighted cost against a per-process rolling 40-per-minute queue before one
   comma-separated `liquidation-history` request.
5. Request `1min`, `convert_to_usd=true`, and the last 60 complete buckets plus one overlap.
6. Validate/deduplicate `(symbol,t)` rows, ignore future/invalid rows, sum expected 5/15/60-minute
   positions, and report gap/coverage counts.
7. Preserve numeric zero; always return null event-level fields with an unsupported reason; state
   that selected-provider coverage is not global coverage.
8. Apply live ≤120s, stale ≤5m, then unavailable; never read canonical upstream liquidation data.

Verification:

- `node --test --import tsx test/unit/coinalyze-client.test.ts test/unit/liquidations.test.ts`
- `npm run typecheck`
- `! rg -n 'MARKET_DATA_API_URL|fetchMarketData' src/clients/coinalyze-client.ts src/features/liquidations.ts`

Completion criteria:

- Coinalyze is the sole liquidation source; coverage selection is auditable and capped; exact
  deterministic windows and all approved narrow-failure states pass mocked tests.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-005 — Add bounded Deribit options surface collection

Status: Completed

Requirements: REQ-F-009, REQ-F-010, REQ-F-011, REQ-F-021, REQ-F-022, REQ-NF-001,
REQ-NF-002, REQ-NF-003, REQ-NF-007, REQ-NF-010

Design: DES-006, DES-007

Dependencies: TASK-002, TASK-003

Expected file or component changes:

- `src/clients/deribit-options-client.ts` — fetch/join catalog and bulk summaries and request
  bounded official tickers.
- `src/features/options-surface.ts` — deterministic expiry/strike/candidate selection and
  expiry-level calculations.
- `src/schemas/deribit.ts` — validate JSON-RPC envelopes, instruments, summaries, and tickers.
- `test/unit/deribit-options-client.test.ts` — cover REST failures, fan-out, concurrency, cache,
  freshness, and partial response handling.
- `test/unit/options-surface.test.ts` — cover input bounds, sorting, OI filter, ATM/25d selection,
  official Greeks, RR, butterfly, and null propagation.

Steps:

1. Fetch BTC non-expired option instruments and BTC option bulk summaries concurrently and join
   by exact instrument name.
2. Select 1–6 nearest future expiries and apply existing OI/include-strike/strike-count inputs.
3. Use provider underlying price, mark IV, interest rate, strike, and expiry only to estimate
   candidate deltas.
4. Request no more than four unique official tickers per expiry: ATM call/put and nearest 25d
   call/put, with maximum concurrency four.
5. Use official ticker IV/Greeks in output; calculate ATM IV, 25d RR, and 25d butterfly from
   available official values.
6. Return bounded strikes sorted ascending after nearest-to-underlying selection; attach Greeks
   only to selected instruments without expanding fan-out.
7. Mark only affected fields/expiries partial on missing or malformed tickers and apply the
   5m-live/15m-stale freshness policy.

Verification:

- `node --test --import tsx test/unit/deribit-options-client.test.ts test/unit/options-surface.test.ts`
- `npm run typecheck`
- Automated assertion that ticker calls are `<= 4 * selectedExpiryCount` and peak concurrency is
  `<= 4`.

Completion criteria:

- Existing option inputs deterministically control a sorted bounded direct Deribit surface, no
  unbounded ticker loop exists, and partial/rate-limited cases preserve valid evidence.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-006 — Add direct Hyperliquid perpetual context with field isolation

Status: Completed

Requirements: REQ-F-012, REQ-F-013, REQ-F-014, REQ-F-021, REQ-F-022, REQ-NF-001,
REQ-NF-002, REQ-NF-007, REQ-NF-010

Design: DES-008

Dependencies: TASK-002, TASK-003

Expected file or component changes:

- `src/clients/hyperliquid-context-client.ts` — fetch/join independently cached
  `metaAndAssetCtxs` and `allMids` REST results.
- `src/schemas/hyperliquid.ts` — validate metadata, contexts, and mids.
- `test/unit/hyperliquid-context-client.test.ts` — cover joins, parallel calls, independent
  failure/nullability, derived fields, timestamps, cache, and freshness.

Steps:

1. POST `metaAndAssetCtxs` and `allMids` to public `/info` in parallel and validate separately.
2. Resolve BTC through returned metadata/name rather than a hard-coded context index.
3. Normalize mark, mid, oracle, hourly funding, OI BTC, calculated OI USD, and simple APR.
4. Keep each field independently nullable and attach direct field source/timestamp/observation
   metadata.
5. Use 15-second caches and reject data after 120 seconds; a missing mids response must not erase
   valid asset-context fields.

Verification:

- `node --test --import tsx test/unit/hyperliquid-context-client.test.ts`
- `npm run typecheck`
- Mock timing assertion proving both `/info` requests begin before either resolves.

Completion criteria:

- Direct Hyperliquid output provides every available approved field, derives OI/APR only from
  valid inputs, and preserves valid fields through independent partial failures.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-007 — Add the Binance Spot client and shared endpoint policy

Status: Completed

Requirements: REQ-F-015, REQ-F-019, REQ-F-021, REQ-F-022, REQ-NF-001, REQ-NF-002,
REQ-NF-007, REQ-NF-009

Design: DES-009, DES-010

Dependencies: TASK-002, TASK-003

Expected file or component changes:

- `src/clients/binance-spot-client.ts` — fetch ticker, 24h statistics, and bounded paginated 1m
  BTCUSDT history with one validated result.
- `src/clients/binance-timeframes-client.ts` — reuse the primary/fallback ordering and safe errors.
- `src/clients/historical-candles-client.ts` — reuse the Binance Spot transport policy where
  applicable without changing its public candle contract.
- `src/schemas/binance.ts` — validate ticker, 24h, and kline payloads.
- `test/unit/binance-spot-client.test.ts` — cover host order, parallel requests, pagination,
  validation, caching, 451, timeout, and partial fields.
- `test/unit/binance-timeframes-client.test.ts` — update existing ordering/diagnostic expectations.

Steps:

1. Make `data-api.binance.vision` the first base for ticker, 24h, 1m, and existing Spot candle
   calls.
2. Attempt standard official hosts only after a bounded primary failure and label the selected
   endpoint/fallback; never proxy or work around 451.
3. Fetch ticker and 24h statistics concurrently with 1m history from the supplied earliest
   anchor.
4. Paginate klines by last open time plus one minute, with at most two pages/2,000 rows.
5. Parse/sort/deduplicate/validate bars and expose gaps, truncation, current-bar state, and source
   metadata.
6. Normalize price, 24h change/high/low/base volume/quote volume, and field timestamps under a
   15-second cache and 120-second age ceiling.

Verification:

- `node --test --import tsx test/unit/binance-spot-client.test.ts test/unit/binance-timeframes-client.test.ts`
- `npm run typecheck`
- Automated assertion that a healthy `data-api.binance.vision` fixture results in zero standard-
  host calls and no history request exceeds two pages.

Completion criteria:

- Every Binance Spot path uses the approved primary host first, 451 behavior is bounded/labeled,
  and the client returns validated ticker/24h/1m evidence without geographic workarounds.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-008 — Replace session VWAP with exact live one-minute calculations

Status: Completed

Requirements: REQ-F-016, REQ-F-017, REQ-F-018, REQ-F-019, REQ-NF-007, REQ-NF-010

Design: DES-011, DES-015

Dependencies: TASK-007

Expected file or component changes:

- `src/features/market-state.ts` — calculate exact quote/base session VWAP and ranges from a
  dedicated one-minute series while preserving existing anchors.
- `src/services/bats-service.ts` — request/pass the live 1m series separately from closed
  indicator history and enforce execution completeness.
- `test/unit/bats-features.test.ts` — replace/add exact math, anchor, gap, zero-volume, partial-bar,
  profile, range, and indicator-isolation cases.

Steps:

1. Preserve existing daily UTC, `UTC_DEFAULT`, and `MYT_TRADING` anchor calculations and choose
   the earliest active anchor for the shared Binance request.
2. Calculate `sum(quoteVolume)/sum(baseVolume)` for every named slice, including the current
   partial minute.
3. Return method, anchor, value, deviation, bar count, last included bar time, partial-bar flag,
   high/low, and `completeFromAnchor`.
4. Set completeness false on missing anchor, internal gap, truncation, null quote volume, or zero
   total base volume; preserve calculable partial evidence with a reason.
5. Keep the 1m partial series outside all indicator/pivot functions and prove open-bar changes do
   not alter EMA/RSI/MACD/ATR/ADX outputs.
6. Define the additive singular spot session range as `daily_utc` and keep named ranges in BATS
   levels.

Verification:

- `node --test --import tsx test/unit/bats-features.test.ts`
- `npm run typecheck`
- Fixture assertion that exact VWAP equals the fixture's quote-volume sum divided by base-volume
  sum and differs from the prior typical-price method where constructed to do so.

Completion criteria:

- All named VWAPs are exact, reproducible, and quality-gated from the shared 1m series, while
  technical indicators remain strictly closed-candle calculations.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-009 — Build the section-plan aggregator, fallback policy, and normalized merge

Status: Completed

Requirements: REQ-F-001, REQ-F-008, REQ-F-010, REQ-F-011, REQ-F-013, REQ-F-014,
REQ-F-020, REQ-F-021, REQ-F-022, REQ-NF-001, REQ-NF-002, REQ-NF-003, REQ-NF-005,
REQ-NF-008, REQ-NF-009

Design: DES-012, DES-013, DES-014

Dependencies: TASK-004, TASK-005, TASK-006, TASK-007, TASK-008

Expected file or component changes:

- `src/services/direct-market-data-service.ts` — execute section plans with parallel
  `Promise.allSettled`, direct precedence, deadlines, and section-aware fallback.
- `src/clients/market-data-client.ts` — expose compatible validated upstream sections without
  making upstream a mandatory first request.
- `src/normalizers/snapshot.ts` — merge direct sections, field-level source maps, freshness,
  warnings, additive spot data, and compatible fallback.
- Provider-specific schemas/domain types — finalize normalized envelopes and safe warnings.
- `test/unit/direct-market-data-service.test.ts` — cover requested/skipped sections, parallelism,
  narrow failure, stale policy, fallback, and deadline behavior.
- `test/unit/normalization.test.ts` — extend direct precedence, mixed provenance, spot, freshness,
  and additive compatibility fixtures.

Steps:

1. Translate internal section plans into only the required provider calls and execute independent
   branches with `Promise.allSettled`.
2. Use direct valid values first; request canonical fallback lazily for compatible missing
   Binance, Deribit, or Hyperliquid data only.
3. Never read, normalize, cache, or return the canonical upstream liquidation section.
4. For Hyperliquid, merge fallback per missing field; for Deribit, merge only matching compatible
   expiry/instrument fields; never overwrite valid direct fields.
5. Apply destination freshness cutoffs to fallback and expose every field/section source,
   timestamp, age, method, fallback flag, cache state, reason, and bounded warning.
6. Ensure an optional timeout/failure cannot turn a valid core result into a transport error or
   push the comprehensive path beyond 12 seconds.

Verification:

- `node --test --import tsx test/unit/direct-market-data-service.test.ts test/unit/normalization.test.ts`
- `npm run typecheck`
- Automated assertion that liquidations never contain `canonical market-data API` as source and
  excluded sections make zero corresponding provider calls.

Completion criteria:

- One aggregator owns direct orchestration and compatible fallback; source mixing is truthful,
  optional failures are narrow, and upstream liquidations are impossible to consume.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-010 — Integrate all existing tools, BATS quality, spot output, and versions

Status: Completed

Requirements: REQ-F-019, REQ-F-020, REQ-F-025, REQ-NF-002, REQ-NF-006, REQ-NF-009

Design: DES-015, DES-016, DES-018

Dependencies: TASK-009

Expected file or component changes:

- `src/tools/all.ts` — replace direct `snap` assembly with section plans, respect include flags,
  and add spot to the three approved outputs.
- `src/services/bats-service.ts` and `src/domain/quality.ts` — preserve readiness/completeness
  semantics and update schema/calculation versions.
- `src/config/env.ts`, `README.md`, or the existing service version source — update service
  version consistently.
- `test/unit/tool-contract.test.ts` — prove twelve names, existing inputs/defaults/fields, section
  skipping, additive spot, and read-only behavior.
- Existing timeframe/BATS/normalization tests — update only additive expectations.

Steps:

1. Map every existing tool to the minimum required section plan, including existing option and
   liquidation include flags and bounds.
2. Add normalized `spot` to snapshot, report context, and BATS context only; preserve every prior
   field and JSON fallback.
3. Keep liquidation failure limited to `C1LiquidationReversal=false` and options optional; do not
   change core execution readiness for an optional failure.
4. Preserve all twelve tool names, input fields, defaults, descriptions' read-only guarantees,
   and result size limiting.
5. Update service to `1.2.0`, schema to `1.1.0`, and calculation to `bats-1.1.0`.

Verification:

- `node --test --import tsx test/unit/tool-contract.test.ts test/unit/timeframes-tool.test.ts test/unit/normalization.test.ts`
- `npm test`
- `npm run typecheck`

Completion criteria:

- All twelve tools register and behave compatibly, requested sections alone consume provider
  quota, the three approved outputs contain spot, and version identifiers are exact.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-011 — Extend provider health, quality, and safe diagnostics

Status: Completed

Requirements: REQ-F-008, REQ-F-011, REQ-F-021, REQ-F-022, REQ-NF-002, REQ-NF-005,
REQ-NF-008

Design: DES-017

Dependencies: TASK-009, TASK-010

Expected file or component changes:

- `src/tools/all.ts` or a focused health service — report per-provider readiness, latency,
  freshness, cache, fallback, coverage, last attempt/success, and safe reason.
- Provider/cache diagnostic state — expose safe aggregate metadata only.
- `test/unit/health.test.ts` — cover healthy, missing key, partial, stale, 401, 429, timeout,
  malformed, and secret-redaction states.

Steps:

1. Define core readiness from required Binance/Hyperliquid evidence and keep Coinalyze/Deribit
   optional.
2. Report configuration only as boolean/state, never as a key/value or credential-bearing URL.
3. Include last attempt/success, duration, cache status, age/freshness, coverage, fallback, and
   bounded safe failure per provider.
4. Deduplicate/cap warnings and remove raw body prefixes/stack traces from any reachable output.
5. Preserve existing health fields additively so current consumers remain valid.

Verification:

- `node --test --import tsx test/unit/health.test.ts`
- `npm run typecheck`
- Secret-canary test confirming the canary appears nowhere in structured content, JSON fallback,
  warnings, errors, health output, or captured logs.

Completion criteria:

- Health truthfully separates core readiness from optional coverage and exposes actionable safe
  diagnostics without credentials, raw payloads, or stack traces.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-012 — Document local and Vercel Cloud environment setup

Status: Completed

Requirements: REQ-F-023, REQ-F-024, REQ-NF-004, REQ-NF-005

Design: DES-019

Dependencies: TASK-001, TASK-010, TASK-011

Expected file or component changes:

- `.env.example` — add the three approved variables with safe placeholders/defaults.
- `README.md` — document Coinalyze purpose, optional behavior, local `.env.local`, Vercel
  Production/Preview setup, server-only handling, quota exposure, and provider freshness.

Steps:

1. Add `COINALYZE_API_KEY=`, optional `COINALYZE_LIQUIDATION_SYMBOLS=`, and
   `DIRECT_PROVIDER_TIMEOUT_MS=4000` to `.env.example`; add no Redis/database/storage variable.
2. Explain that the free Coinalyze key is required only for liquidations and that missing/invalid
   configuration leaves core MCP readiness operational.
3. Give Dashboard and CLI instructions for sensitive server-only Production and Preview setup;
   use `.env.local` for local development.
4. State that the key must never be named `NEXT_PUBLIC_*`, committed, logged, or returned by MCP.
5. Explain the bounded ephemeral process cache, no Redis/PostgreSQL/database architecture,
   section-specific freshness, and public-endpoint quota risk.
6. Update the README's service/schema/calculation version references where present.

Verification:

- `rg -n 'COINALYZE_API_KEY|COINALYZE_LIQUIDATION_SYMBOLS|DIRECT_PROVIDER_TIMEOUT_MS|\.env\.local|Production|Preview|NEXT_PUBLIC|Redis|PostgreSQL|database' README.md .env.example`
- `test "$(rg -c '^COINALYZE_API_KEY=' .env.example)" -eq 1`
- `test "$(rg -c '^COINALYZE_LIQUIDATION_SYMBOLS=' .env.example)" -eq 1`
- `test "$(rg -c '^DIRECT_PROVIDER_TIMEOUT_MS=4000$' .env.example)" -eq 1`

Completion criteria:

- Operators can configure local, Preview, and Production safely; documentation states optional
  degradation and conclusively rules out Redis/databases/durable storage.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-013 — Add the explicit redacted live-provider smoke command

Status: Completed

Requirements: REQ-F-026, REQ-NF-005, REQ-NF-007

Design: DES-020

Dependencies: TASK-004, TASK-005, TASK-006, TASK-007, TASK-009, TASK-011

Expected file or component changes:

- `scripts/smoke-providers.ts` — opt-in direct provider checks with per-provider results and
  credential redaction.
- `package.json` — add `smoke:providers` without wiring it into test/build/CI scripts.
- `README.md` — document invocation, required variables, and expected partial outcomes.
- `test/unit/smoke-command.test.ts` — test argument/help/redaction behavior with mocked clients.

Steps:

1. Add a command that can check Binance, Hyperliquid, Deribit, and configured Coinalyze
   independently and supports `--help` without network access.
2. Reuse production provider clients/policies rather than duplicating raw fetch code.
3. Print only provider, status, latency, freshness, coverage, and safe reason; never print the key,
   headers, raw payloads, or stack traces.
4. Make optional-provider unavailability visible and distinguish it from a core-provider failure.
5. Keep the script out of `npm test`, builds, hooks, and CI workflows.

Verification:

- `node --test --import tsx test/unit/smoke-command.test.ts`
- `npm run smoke:providers -- --help`
- `npm run typecheck`
- Inspect package/CI scripts to confirm `smoke:providers` is never invoked automatically.

Completion criteria:

- An operator has one explicit safe command for live REST verification, while all automated
  validation remains mocked and network-free.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

### TASK-014 — Prove compatibility, performance, statelessness, and release readiness

Status: Completed

Requirements: REQ-F-001, REQ-F-020, REQ-F-025, REQ-F-026, REQ-NF-001, REQ-NF-002,
REQ-NF-003, REQ-NF-004, REQ-NF-005, REQ-NF-006, REQ-NF-007, REQ-NF-008, REQ-NF-009,
REQ-NF-010

Design: DES-002, DES-003, DES-012, DES-014, DES-016, DES-017, DES-018, DES-020

Dependencies: TASK-010, TASK-011, TASK-012, TASK-013

Expected file or component changes:

- `test/unit/performance.test.ts` — mocked cached/uncached/deadline/concurrency assertions.
- `test/unit/stateless-security.test.ts` — dependency/config/source/fetch-host/secret scans and
  cache-reset operation.
- Contract/regression fixtures — close any coverage gaps found by the final matrix review.
- No production scope expansion; only corrections necessary to satisfy approved documents.

Steps:

1. Add deterministic mocked timing tests for ≤2s cached, ≤12s uncached comprehensive, and ≤4s
   individual provider behavior without wall-clock sleeps.
2. Prove independent provider parallelism, keyed dedupe, local budget/fan-out caps, and narrow
   stale/failure behavior.
3. Scan direct/transitive application dependencies, runtime source, environment variables, and
   deployment configuration for Redis/database clients, endpoints, connection strings,
   migrations, schemas, or storage bindings.
4. Intercept all test fetches and fail on any unmocked host or Redis/database/storage endpoint;
   clear process cache and prove the next request succeeds using provider fixtures alone.
5. Run secret-canary and raw-body/stack-trace checks over logs, errors, health, structured content,
   and JSON fallback.
6. Confirm all twelve tools, exact version identifiers, unchanged 15-second Vercel duration, and
   full requirement/design coverage.
7. Run the complete formatting, lint, typecheck, test, and production build suite and record exact
   results in implementation notes/PR description.

Verification:

- `node --test --import tsx test/unit/performance.test.ts test/unit/stateless-security.test.ts`
- `npm run format`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `rg -n '"maxDuration":15' vercel.json`
- `! rg -ni 'redis|ioredis|postgres|pg-promise|mysql|sqlite|mongodb|mongoose|dynamodb|upstash|supabase|DATABASE_URL|REDIS_URL' package.json package-lock.json src .env.example vercel.json`

Completion criteria:

- Every acceptance criterion passes, no live CI call or Redis/database/storage dependency exists,
  performance/degradation targets are proven, the production build succeeds, and the single PR
  is ready for review with focused implementation checkpoints.

Implementation notes:

- Implemented the approved bounded REST-only scope with deterministic schema validation, ephemeral caching, safe provider isolation, additive contracts, and documentation. Verification: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Coverage matrix

| Requirement or design ID | Implementing tasks                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| REQ-F-001                | TASK-009, TASK-014                                                                                 |
| REQ-F-002                | TASK-001, TASK-004                                                                                 |
| REQ-F-003                | TASK-004                                                                                           |
| REQ-F-004                | TASK-004                                                                                           |
| REQ-F-005                | TASK-004                                                                                           |
| REQ-F-006                | TASK-004                                                                                           |
| REQ-F-007                | TASK-004                                                                                           |
| REQ-F-008                | TASK-003, TASK-004, TASK-009, TASK-011                                                             |
| REQ-F-009                | TASK-005                                                                                           |
| REQ-F-010                | TASK-005, TASK-009                                                                                 |
| REQ-F-011                | TASK-003, TASK-005, TASK-009, TASK-011                                                             |
| REQ-F-012                | TASK-006                                                                                           |
| REQ-F-013                | TASK-006, TASK-009                                                                                 |
| REQ-F-014                | TASK-006, TASK-009                                                                                 |
| REQ-F-015                | TASK-007                                                                                           |
| REQ-F-016                | TASK-008                                                                                           |
| REQ-F-017                | TASK-008                                                                                           |
| REQ-F-018                | TASK-008                                                                                           |
| REQ-F-019                | TASK-007, TASK-008, TASK-010                                                                       |
| REQ-F-020                | TASK-001, TASK-009, TASK-010, TASK-014                                                             |
| REQ-F-021                | TASK-003, TASK-005, TASK-006, TASK-007, TASK-009, TASK-011                                         |
| REQ-F-022                | TASK-002, TASK-004, TASK-005, TASK-006, TASK-007, TASK-009, TASK-011                               |
| REQ-F-023                | TASK-001, TASK-012                                                                                 |
| REQ-F-024                | TASK-001, TASK-012                                                                                 |
| REQ-F-025                | TASK-010, TASK-014                                                                                 |
| REQ-F-026                | TASK-013, TASK-014                                                                                 |
| REQ-NF-001               | TASK-002, TASK-003, TASK-005, TASK-006, TASK-007, TASK-009, TASK-014                               |
| REQ-NF-002               | TASK-002, TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-009, TASK-010, TASK-011, TASK-014 |
| REQ-NF-003               | TASK-002, TASK-003, TASK-004, TASK-005, TASK-009, TASK-014                                         |
| REQ-NF-004               | TASK-001, TASK-002, TASK-012, TASK-014                                                             |
| REQ-NF-005               | TASK-001, TASK-003, TASK-004, TASK-009, TASK-011, TASK-012, TASK-013, TASK-014                     |
| REQ-NF-006               | TASK-001, TASK-010, TASK-014                                                                       |
| REQ-NF-007               | TASK-003, TASK-004, TASK-005, TASK-006, TASK-007, TASK-008, TASK-013, TASK-014                     |
| REQ-NF-008               | TASK-009, TASK-011, TASK-014                                                                       |
| REQ-NF-009               | TASK-003, TASK-007, TASK-009, TASK-010, TASK-014                                                   |
| REQ-NF-010               | TASK-002, TASK-004, TASK-005, TASK-006, TASK-008, TASK-014                                         |
| DES-001                  | TASK-001                                                                                           |
| DES-002                  | TASK-002, TASK-014                                                                                 |
| DES-003                  | TASK-003, TASK-014                                                                                 |
| DES-004                  | TASK-004                                                                                           |
| DES-005                  | TASK-004                                                                                           |
| DES-006                  | TASK-005                                                                                           |
| DES-007                  | TASK-005                                                                                           |
| DES-008                  | TASK-006                                                                                           |
| DES-009                  | TASK-007                                                                                           |
| DES-010                  | TASK-007                                                                                           |
| DES-011                  | TASK-008                                                                                           |
| DES-012                  | TASK-009, TASK-014                                                                                 |
| DES-013                  | TASK-009                                                                                           |
| DES-014                  | TASK-001, TASK-009, TASK-014                                                                       |
| DES-015                  | TASK-008, TASK-010                                                                                 |
| DES-016                  | TASK-010, TASK-014                                                                                 |
| DES-017                  | TASK-011, TASK-014                                                                                 |
| DES-018                  | TASK-010, TASK-014                                                                                 |
| DES-019                  | TASK-012                                                                                           |
| DES-020                  | TASK-003, TASK-013, TASK-014                                                                       |
