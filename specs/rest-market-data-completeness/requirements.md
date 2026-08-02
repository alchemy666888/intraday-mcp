# Requirements: REST Market Data Completeness

Status: Approved

## Objective

Make `intraday-mcp` self-contained for the report-critical BTC market data that is currently
missing or unreliable, using REST APIs only. The enhancement must add provider-owned Coinalyze
liquidation aggregates, Deribit options, Hyperliquid perpetual context, exact Binance Spot
session VWAP, and normalized spot statistics while preserving narrow degradation, source
provenance, existing MCP contracts, Vercel Hobby compatibility, and the canonical upstream API
as a backward-compatible fallback.

## Background

The repository already provides deterministic historical candles, closed-candle indicators,
market-state calculations, reference levels, and twelve read-only MCP tools. However, the
legacy snapshot path still relies on the canonical upstream API for liquidations, Deribit
options, and Hyperliquid perpetual data. Live diagnostics on 31 July 2026 showed liquidation
data unavailable because Redis was not configured, Deribit options unavailable after HTTP 429,
and null Hyperliquid mid/oracle fields. The direct Binance fallback works, but currently probes
standard Binance hosts before `data-api.binance.vision`, causing avoidable HTTP 451 failures.
The current session VWAP calculation also uses typical price multiplied by base volume rather
than exact quote-volume/base-volume aggregation.

This enhancement replaces the unavailable WebSocket/Redis design for the targeted data with
bounded REST polling. Coinalyze becomes the primary liquidation-aggregate source. The MCP
continues to degrade only the affected analysis when an optional provider is absent, stale,
rate-limited, malformed, or unreachable.

## Stakeholders and users

- ChatGPT users consuming the BTC Intraday Market Data MCP.
- The repository owner and maintainers operating the Vercel deployment.
- Analysts relying on BATS PA, momentum, VWAP, derivatives, liquidation, and options context.
- Operators responsible for provider credentials, rate limits, freshness, and diagnostics.

## Scope

### In scope

- Direct REST ownership in this repository for Coinalyze BTC liquidation aggregates.
- Automatic selection of supported BTC perpetual markets from a confirmed exchange allowlist,
  with an environment-variable symbol override.
- Direct REST ownership for the existing Deribit BTC options contract.
- Direct REST ownership for Hyperliquid mark, mid, oracle, funding, and open interest.
- Exact Binance Spot session VWAP from quote and base volume, including the current partial
  one-minute bar.
- Binance Spot price, 24-hour statistics, and session high/low.
- Provider-specific freshness, caching, rate-limit handling, provenance, partial failure, and
  canonical-upstream fallback behavior.
- Additive extensions to existing MCP outputs without tool removal or input breakage.
- Deterministic automated tests and an explicit live-provider smoke command.
- `.env.example` and `README.md` Vercel Cloud environment-variable instructions.
- Service, schema, and calculation version updates.

### Boundaries

- Changes are limited to `alchemy666888/intraday-mcp`.
- The transport remains read-only Streamable HTTP MCP on Next.js and Vercel.
- Provider collection is request-driven REST polling with bounded in-process caching and
  request deduplication.
- The external canonical service at `alchemy666888.vercel.app` is not modified.
- Liquidation coverage represents selected Coinalyze-supported markets, not the entire global
  derivatives market.

## Functional requirements

| ID | Requirement | Rationale |
|---|---|---|
| REQ-F-001 | The MCP must fetch the in-scope Binance Spot, Hyperliquid, Coinalyze, and Deribit data directly from this repository, while retaining the canonical upstream sections as fallback inputs where compatible. | Removes dependence on missing upstream sections without abruptly removing the existing integration. |
| REQ-F-002 | The MCP must authenticate Coinalyze requests with the server-only `COINALYZE_API_KEY` environment variable and must not require this key for MCP startup or non-liquidation tools. | Liquidations are optional and must not become a global readiness dependency. |
| REQ-F-003 | The MCP must discover Coinalyze-supported BTC perpetual markets and select at most eight markets from the ordered allowlist Binance, Bybit, OKX, BitMEX, Gate, Deribit, and Hyperliquid, subject to actual provider support. | Provides broad but bounded coverage within the free request budget. |
| REQ-F-004 | When `COINALYZE_LIQUIDATION_SYMBOLS` contains a valid comma-separated list, the MCP must use that list instead of automatic market selection and must return the actual requested and included symbols. | Gives operators explicit, auditable control over coverage. |
| REQ-F-005 | The MCP must retrieve Coinalyze one-minute BTC liquidation history in USD and deterministically aggregate long, short, and total liquidation values over rolling 5-minute, 15-minute, and 1-hour windows. | Fulfils the existing liquidation-window contract without WebSockets or Redis. |
| REQ-F-006 | Every Coinalyze liquidation result must identify the provider, included venues and symbols, excluded or unsupported selections, collection mode, source timestamps, freshness, and the statement that coverage is selected-provider coverage rather than complete global coverage. | Prevents unsupported market-wide claims. |
| REQ-F-007 | Coinalyze-derived `eventCount`, `largestLiquidationUsd`, and `lastEventAt` fields must remain null and carry an explicit provider-does-not-supply reason. | Coinalyze bucket history does not establish event-level facts. |
| REQ-F-008 | A missing or invalid Coinalyze key, HTTP 401, HTTP 429, timeout, malformed response, stale response, or empty supported-market result must make liquidation data unavailable or stale according to policy while leaving core MCP readiness and non-liquidation tools operational. | Enforces narrow degradation. |
| REQ-F-009 | Direct Deribit public REST must be the primary source for the existing bounded BTC options surface: expiries, strikes, ATM IV, 25-delta call/put IV, risk reversal, butterfly, Greeks, and open interest. | Restores the current options contract without broad per-request ticker fan-out. |
| REQ-F-010 | Deribit options collection must bound requested expiries and strikes according to existing tool inputs, preserve sorted output, and use the compatible canonical upstream options section only when direct data is unavailable and fallback data passes validation and freshness checks. | Preserves existing behavior and controls rate-limit exposure. |
| REQ-F-011 | A Deribit rate limit, timeout, malformed contract, incomplete expiry, or partial ticker result must degrade only the affected option fields or expiries and must not invalidate core BATS completeness. | Options are optional context. |
| REQ-F-012 | Direct Hyperliquid REST must be the primary source for BTC mark price, mid price, oracle price, hourly funding, open interest in BTC, calculated open interest in USD, and simple funding APR. | Completes currently null perpetual fields with venue-owned data. |
| REQ-F-013 | Hyperliquid perpetual fields must be independently nullable and independently attributable; a missing mid or oracle field must not erase valid mark, funding, or open-interest fields. | Supports truthful partial responses. |
| REQ-F-014 | The canonical upstream perpetual section may be used only as a field-level fallback when direct Hyperliquid data is missing, valid, and within freshness policy; the result must identify which fields were filled by fallback. | Retains compatibility without obscuring mixed provenance. |
| REQ-F-015 | `data-api.binance.vision` must be the primary Binance Spot REST base for candles, ticker, and 24-hour statistics; standard Binance hosts may be attempted only as labeled fallbacks, without proxies or geographic workarounds. | Avoids known HTTP 451 latency while respecting access restrictions. |
| REQ-F-016 | The MCP must calculate each named session VWAP as `sum(quoteVolume) / sum(baseVolume)` over Binance Spot one-minute bars from the named anchor through the latest available bar, including the current partial one-minute bar. | Supplies exact venue-volume VWAP appropriate for live location checks. |
| REQ-F-017 | Every session VWAP must return its anchor, value, deviation, method, source-bar count, last included bar time, current-bar inclusion, and `completeFromAnchor`; incomplete or zero-volume input must not satisfy execution-critical VWAP completeness. | Makes VWAP location reproducible and quality-gated. |
| REQ-F-018 | Technical indicators must continue to use closed candles only even though live session VWAP includes the current partial one-minute bar. | Prevents open-candle indicator contamination. |
| REQ-F-019 | The existing snapshot, report-context, and BATS-context tools must add an optional `spot` section containing current Binance Spot price, 24-hour change, high, low, base volume, quote volume, session high, session low, and field/source timestamps. | Normalizes report data that is currently gathered outside the MCP. |
| REQ-F-020 | Existing MCP tool names, existing input fields, existing defaults, and existing response fields must remain available; new fields must be additive. | Protects existing ChatGPT integrations. |
| REQ-F-021 | Every direct or fallback provider section must return `source`, `venue`, `marketType`, `method`, source timestamp, receipt timestamp, age, freshness status, fallback state, and bounded warnings without secrets or raw stack traces. | Preserves first-class provenance and operability. |
| REQ-F-022 | Source freshness must be classified as follows: Binance Spot and Hyperliquid are live through 120 seconds; Coinalyze is live through 120 seconds, stale through 5 minutes, then unavailable; Deribit is live through 5 minutes, stale through 15 minutes, then unavailable. | Makes provider state deterministic and prevents hidden staleness. |
| REQ-F-023 | `README.md` and `.env.example` must document `COINALYZE_API_KEY`, optional `COINALYZE_LIQUIDATION_SYMBOLS`, and optional `DIRECT_PROVIDER_TIMEOUT_MS` with a default of 4000 milliseconds. | Provides the requested Vercel Cloud and local setup contract. |
| REQ-F-024 | The Vercel instructions must state that `COINALYZE_API_KEY` is a sensitive, server-only variable for Production and Preview, local development uses `.env.local`, and the key must never use a `NEXT_PUBLIC_*` name or appear in MCP output. | Prevents client-side or diagnostic leakage. |
| REQ-F-025 | The release must identify itself as service version `1.2.0`, schema version `1.1.0`, and calculation version `bats-1.1.0`. | Signals the additive data and calculation change consistently. |
| REQ-F-026 | Provider behavior must be covered by deterministic mock-based automated tests, and live REST validation must be available only through an explicit local smoke command. | Keeps CI reproducible while allowing operator verification. |

## Non-functional requirements

| ID | Quality attribute | Measurable requirement |
|---|---|---|
| REQ-NF-001 | Performance | A cached MCP request must complete within 2 seconds, an uncached comprehensive request within 12 seconds, and an individual provider must not block longer than `DIRECT_PROVIDER_TIMEOUT_MS`, whose default and maximum for this release are 4000 milliseconds. |
| REQ-NF-002 | Reliability | Independent provider requests must execute without one optional provider preventing successful core results; stale fallback must always be labeled. |
| REQ-NF-003 | Rate-limit safety | The implementation must bound provider concurrency, deduplicate concurrent equivalent requests, honor `Retry-After`, apply bounded backoff, and stop requesting when its local request budget would be exceeded. |
| REQ-NF-004 | Stateless operation | The MCP must not use, connect to, read from, or write to Redis or any database—including SQL, NoSQL, time-series, embedded, hosted, or serverless databases—for caching, persistence, history, deduplication, quotas, coordination, or any other runtime function. It must add no Redis/database client, adapter, connection string, or storage environment variable. The only permitted mutable state is bounded, ephemeral in-process memory that may disappear on restart or between Vercel instances. |
| REQ-NF-005 | Security | Secrets must remain server-side, must be redacted from logs and errors, and must never appear in structured content, JSON fallback, health output, or source attribution. |
| REQ-NF-006 | Compatibility | The existing twelve tools must register successfully, and all existing unit tests and contract expectations must continue to pass unless an expectation is additively extended by this approved specification. |
| REQ-NF-007 | Testability | CI tests must make zero live provider calls and must include fixtures for success, HTTP 401, HTTP 429 with `Retry-After`, timeout, malformed data, stale data, zero volume, incomplete anchors, and partial-provider success. |
| REQ-NF-008 | Observability | Health and quality outputs must expose provider readiness, freshness, cache state, latency, coverage, and safe failure reason without exposing credentials, raw payloads, or stack traces. |
| REQ-NF-009 | Deployment fit | The implementation must remain within the existing 15-second Vercel MCP function limit and must fail narrowly rather than attempting to bypass Vercel Hobby or provider limits. |
| REQ-NF-010 | Determinism | Given identical normalized provider fixtures and an identical `asOf`, liquidation aggregates, VWAP, option selection, and derived fields must be identical. |

## Constraints

- REST only; no WebSocket connections or streaming collectors.
- No Redis or database of any kind, whether required, optional, embedded, hosted, serverless,
  direct, or used through the canonical upstream for the enhanced direct-provider path.
- No Redis/database client, adapter, connection string, migration, schema, durable cache, or
  storage environment variable. Bounded ephemeral in-process memory is the only permitted
  mutable state.
- No Vercel paid storage or other paid dependency.
- Coinalyze requires a free API key and permits 40 calls per minute per key at the time of
  specification.
- Each Coinalyze symbol consumes request capacity; automatic selection is capped at eight.
- The MCP remains read-only and must not place orders, sign transactions, or produce execution
  instructions.
- Provider terms, attribution, geographic restrictions, and public rate limits must be
  respected.
- Existing Next.js, TypeScript, Zod, MCP SDK, `mcp-handler`, Node test runner, and Vercel
  conventions remain in force.
- The canonical upstream API remains configured for compatible fallback during this release.

## Confirmed assumptions

- Coinalyze one-minute long/short liquidation aggregates are sufficient for the targeted
  liquidation requirement.
- Event-level liquidation count, largest event, and last event time are not required and must
  not be inferred.
- A Coinalyze outage disables only liquidation-dependent C1 logic.
- Deribit options remain optional context.
- Hyperliquid fields may be partially available.
- Live session VWAP includes the current partial one-minute bar; indicators remain closed-only.
- The enhancement remains deployable on Vercel without durable storage.
- The operator will obtain and configure a free Coinalyze API key when liquidation coverage is
  desired.

## Dependencies

- Coinalyze REST API, supported-market catalog, liquidation-history endpoint, and free API key.
- Deribit public REST market-data endpoints.
- Hyperliquid public `/info` REST endpoint.
- Binance Spot public REST data through `data-api.binance.vision` and permitted fallbacks.
- Existing canonical upstream API for compatible fallback data.
- Vercel server-only environment-variable configuration.
- Existing MCP consumers tolerating additive response fields.

## Edge cases

| ID | Scenario | Required behavior |
|---|---|---|
| EDGE-001 | `COINALYZE_API_KEY` is absent. | MCP readiness remains true when core sources are healthy; liquidation windows return unavailable with `missing_api_key`, and C1 completeness is false. |
| EDGE-002 | Coinalyze returns HTTP 401. | Treat the key as invalid, do not retry the same request in that execution, redact credentials, and degrade liquidations only. |
| EDGE-003 | Coinalyze or Deribit returns HTTP 429 with `Retry-After`. | Honor the delay only within the provider deadline; otherwise serve labeled stale cache when allowed or return the section unavailable without delaying core output. |
| EDGE-004 | Fewer than eight allowlisted Coinalyze BTC perpetual markets are supported. | Use the supported subset and report included and excluded venues; do not fail solely because the cap is not reached. |
| EDGE-005 | The liquidation symbol override includes invalid or unsupported symbols. | Exclude invalid symbols, report them explicitly, and use remaining valid symbols; if none remain, return liquidations unavailable. |
| EDGE-006 | Coinalyze history contains missing, duplicate, future, or out-of-order one-minute buckets. | Normalize and deduplicate by symbol and timestamp, ignore future buckets, aggregate only valid unique buckets, and report incomplete coverage. |
| EDGE-007 | Coinalyze returns no liquidation values in a valid complete interval. | Return zero long, short, and total values with live status; do not treat a legitimate zero as missing. |
| EDGE-008 | Coinalyze returns aggregated values but no event metadata. | Return aggregate values and explicit null/unsupported event-level fields. |
| EDGE-009 | Deribit returns only some selected tickers or expiries. | Return valid bounded expiries/strikes, mark the options section partial, and identify omitted fields or contracts. |
| EDGE-010 | Direct Hyperliquid returns mark/funding/OI but no mid or oracle. | Preserve available direct fields and attempt valid field-level upstream fallback; otherwise leave only the missing fields null. |
| EDGE-011 | `data-api.binance.vision` is unavailable and a standard Binance host returns HTTP 451. | Do not use a proxy or retry loop; return a labeled provider failure or compatible cached/fallback data. |
| EDGE-012 | A session anchor predates available one-minute history. | Return the computed partial VWAP with `completeFromAnchor=false`; it cannot satisfy execution-critical completeness. |
| EDGE-013 | Session base volume is zero. | Return VWAP as null with an explicit zero-volume reason and execution-critical completeness false. |
| EDGE-014 | The current one-minute bar is still open. | Include its current quote/base volume only in live VWAP and spot/session fields, mark it as partial, and exclude it from closed-candle indicators. |
| EDGE-015 | One optional provider times out while core sources succeed. | Return core results within the comprehensive deadline and mark only the timed-out provider unavailable or stale. |
| EDGE-016 | Direct data is missing and compatible upstream fallback is stale beyond policy. | Reject the fallback and return the affected fields unavailable. |
| EDGE-017 | All direct and fallback sources for an optional section fail. | Return a valid MCP result with explicit unavailable status; do not fabricate values or convert the failure into a transport error. |
| EDGE-018 | A provider returns malformed, non-finite, negative where prohibited, or schema-incompatible data. | Reject invalid fields, preserve other valid fields, and expose a bounded safe warning. |
| EDGE-019 | Concurrent identical requests arrive in one function instance. | Deduplicate the provider work and share the same validated result without exceeding the local request budget. |

## Acceptance criteria

| ID | Related requirements | Criterion |
|---|---|---|
| AC-001 | REQ-F-001, REQ-F-012, REQ-F-014, REQ-F-015, REQ-NF-002 | Given healthy direct Binance and Hyperliquid fixtures, when snapshot and context tools run, then direct values are returned with direct provenance and no canonical fallback is used. |
| AC-002 | REQ-F-002, REQ-F-008, REQ-NF-005, EDGE-001, EDGE-002 | Given a missing or invalid Coinalyze key, when health and non-liquidation tools run, then they remain operational, liquidations are unavailable with a safe reason, C1 is false, and no secret appears anywhere. |
| AC-003 | REQ-F-003, REQ-F-004, REQ-F-006, REQ-NF-003, EDGE-004, EDGE-005 | Given supported-market and override fixtures, when coverage is selected, then at most eight valid BTC perpetual markets are queried and actual included/excluded symbols and venues are returned. |
| AC-004 | REQ-F-005, REQ-F-007, REQ-NF-010, EDGE-006, EDGE-007, EDGE-008 | Given deterministic one-minute liquidation fixtures, when aggregation runs, then 5m/15m/1h long, short, and total USD values are exact, duplicates are excluded, zero is preserved, and event-level fields are explicitly unsupported. |
| AC-005 | REQ-F-008, REQ-F-022, REQ-NF-002, REQ-NF-003, EDGE-003, EDGE-015, EDGE-017, EDGE-019 | Given rate-limit, timeout, stale-cache, total-failure, and concurrent-request fixtures, when a tool runs, then freshness, deduplication, and narrow-degradation outcomes match policy and core output meets its deadline. |
| AC-006 | REQ-F-009, REQ-F-010, REQ-F-011, REQ-NF-003, EDGE-009 | Given complete and partial Deribit fixtures, when the options tool runs, then bounded sorted expiries/strikes and available metrics are returned, partial fields are labeled, and broad unbounded ticker fan-out does not occur. |
| AC-007 | REQ-F-012, REQ-F-013, REQ-F-014, REQ-F-021, EDGE-010, EDGE-016 | Given partial direct and compatible upstream perpetual fixtures, when normalization runs, then each field retains correct field-level source, nullability, freshness, and fallback attribution. |
| AC-008 | REQ-F-015, REQ-NF-001, EDGE-011 | Given a healthy `data-api.binance.vision` fixture, no standard Binance host is called; given its failure and an HTTP 451 fallback, the failure is bounded, labeled, and no geographic workaround is attempted. |
| AC-009 | REQ-F-016, REQ-F-017, REQ-F-018, REQ-NF-010, EDGE-012, EDGE-013, EDGE-014 | Given one-minute Binance fixtures, when features are calculated, then exact quote/base VWAP includes the partial current minute, reports anchor completeness and method, and indicators remain unchanged by the open bar. |
| AC-010 | REQ-F-019, REQ-F-021, REQ-F-022 | Given healthy Binance ticker, 24-hour, and one-minute fixtures, when snapshot, report-context, and BATS-context run, then each contains the additive normalized `spot` section with required values and timestamps. |
| AC-011 | REQ-F-020, REQ-F-025, REQ-NF-006 | When the MCP registers after the enhancement, then all twelve existing tool names and inputs remain usable, prior tests pass, and service/schema/calculation versions are `1.2.0`, `1.1.0`, and `bats-1.1.0`. |
| AC-012 | REQ-F-021, REQ-F-022, REQ-NF-008, EDGE-018 | Given valid, stale, partial, malformed, and unavailable fixtures, then quality and health outputs expose bounded provider status, timing, cache, coverage, and safe reasons without raw payloads or stack traces. |
| AC-013 | REQ-F-023, REQ-F-024, REQ-NF-005 | When documentation is inspected, then `.env.example` and `README.md` describe the three approved variables, Vercel Production/Preview setup, `.env.local`, sensitive server-only handling, and the prohibition on `NEXT_PUBLIC_*`. |
| AC-014 | REQ-F-026, REQ-NF-007 | When `npm test` runs without network access, then all provider and edge-case fixtures pass with zero live calls; when the explicit smoke command is run by an operator with configured access, then it reports each provider independently. |
| AC-015 | REQ-NF-001, REQ-NF-009 | Under the specified mocked timing tests, cached requests finish within 2 seconds, uncached comprehensive requests within 12 seconds, provider timeouts occur by 4 seconds, and the existing Vercel 15-second limit is not increased. |
| AC-016 | REQ-NF-004, REQ-NF-006 | When source code, direct and transitive application dependencies, environment variables, deployment configuration, and runtime network-call tests are inspected, then the MCP has no Redis/database client, adapter, connection string, migration, schema, storage call, or Redis/database endpoint; it operates correctly after process state is cleared; only bounded ephemeral in-process cache/deduplication state is used; and the existing read-only MCP contract remains intact. |

## NOT-TO-DOs

| ID | Explicit exclusion | Reason |
|---|---|---|
| NTD-001 | Do not add WebSockets, streaming collectors, background workers, or scheduled collectors. | The confirmed architecture is REST-only and request-driven. |
| NTD-002 | Do not add or retain any MCP runtime path that uses Redis or a database of any kind, even as an optional cache, fallback, embedded store, quota tracker, history store, or coordination mechanism; do not add Vercel paid storage or another paid dependency. | The MCP must remain stateless across processes and deployments, with only bounded ephemeral in-process state. |
| NTD-003 | Do not describe Coinalyze results as complete global liquidation coverage. | Only selected supported markets are queried. |
| NTD-004 | Do not infer or fabricate liquidation event count, largest event, or last-event time from aggregate buckets. | The selected provider does not supply event-level evidence. |
| NTD-005 | Do not add Gate, BitMEX, Deribit, or another source solely for event-level liquidation records in this enhancement. | Coinalyze aggregates were confirmed sufficient. |
| NTD-006 | Do not implement durable OI history, macro/news event feeds, order-book analytics, trade-level CVD, or additional price venues. | These require separate future specifications. |
| NTD-007 | Do not change or deploy the external canonical upstream API. | Work is limited to this repository. |
| NTD-008 | Do not use proxies, VPNs, endpoint circumvention, or repeated retries to bypass provider geographic restrictions. | Provider access restrictions must be respected. |
| NTD-009 | Do not rename or remove existing MCP tools, remove inputs, change existing defaults incompatibly, or remove existing response fields. | Existing consumers require backward compatibility. |
| NTD-010 | Do not expose `COINALYZE_API_KEY` through client code, `NEXT_PUBLIC_*`, logs, health output, warnings, structured content, or JSON fallback. | It is a server-side secret. |
| NTD-011 | Do not add trading, order placement, wallet, account, signing, prediction, recommendation, or execution functionality. | The service is read-only market research infrastructure. |
| NTD-012 | Do not make optional liquidation or options availability a core MCP readiness requirement. | Narrow degradation is a confirmed product rule. |

## Risks

| ID | Risk | Impact | Mitigation or decision |
|---|---|---|---|
| RISK-001 | Coinalyze free access, terms, rate limits, symbols, or exchange coverage may change. | Liquidation data may become partial or unavailable. | Discover supported markets, expose actual coverage, bound calls, attribute Coinalyze, and degrade only C1. |
| RISK-002 | In-process caches are not shared across Vercel instances. | Multiple cold instances may consume more provider budget than expected. | Cap markets, deduplicate per instance, use TTL caches and local budgets, and fail narrow before knowingly exceeding limits. |
| RISK-003 | Deribit per-instrument detail can still trigger HTTP 429. | Some Greeks or expiries may be partial. | Batch broad discovery/summary, bound detail selection, honor `Retry-After`, cache, and return partial options. |
| RISK-004 | Provider schemas may change without notice. | Normalization may reject data. | Validate all external data, preserve valid independent fields, test malformed fixtures, and report safe failures. |
| RISK-005 | Field-level fallback can mix source timestamps. | Cross-section comparisons may be misleading. | Return field/source timestamps and fallback attribution, and reject stale fallback. |
| RISK-006 | Including the partial current one-minute bar makes live VWAP change within the minute. | Repeated checks can differ before the minute closes. | Mark current-bar inclusion and last included time; keep indicators closed-only. |
| RISK-007 | Automatic exchange names may not map one-to-one to Coinalyze identifiers. | Intended venues may be excluded. | Validate provider metadata, return included/excluded mappings, and support explicit symbol override. |
| RISK-008 | Public unauthenticated MCP access can consume Coinalyze quota. | Liquidations may become rate-limited. | Preserve existing authentication option, cache/deduplicate, enforce local budget, and document the exposure. |
| RISK-009 | Exact session VWAP requires complete one-minute history from its anchor. | Partial history could falsely appear authoritative. | Require `completeFromAnchor` for execution-critical completeness. |

## Resolved decisions

| Topic | Confirmed decision | Basis |
|---|---|---|
| Feature destination | `specs/rest-market-data-completeness/` | User confirmation. |
| Ownership boundary | Direct REST integrations live in `intraday-mcp`; canonical upstream is fallback. | User confirmation. |
| Liquidation provider | Use Coinalyze. | User instruction and confirmation. |
| Liquidation detail | One-minute long/short aggregates are sufficient; event-level fields remain unsupported. | User confirmation. |
| Liquidation coverage selection | Automatic allowlisted BTC perpetual selection capped at eight, with symbol override. | User confirmation. |
| Missing Coinalyze key | Core remains ready; only liquidation-dependent C1 is disabled. | User confirmation. |
| Deribit | Direct REST primary, existing bounded surface retained, optional on failure. | User confirmation. |
| Hyperliquid | Combine direct REST context with independently nullable fields and upstream fallback. | User confirmation. |
| VWAP | Exact quote/base one-minute aggregation includes current partial minute; indicators stay closed-only. | User confirmation. |
| Binance endpoint | `data-api.binance.vision` primary; permitted standard hosts are labeled fallbacks; no workaround. | User confirmation. |
| Spot output | Add `spot` to existing snapshot, report-context, and BATS-context; no new tool. | User confirmation. |
| Versions | Service `1.2.0`, schema `1.1.0`, calculation `bats-1.1.0`. | User confirmation. |
| Performance | Cached 2 seconds, uncached comprehensive 12 seconds, provider timeout 4 seconds. | User confirmation. |
| Storage | No Redis or database of any kind for any MCP runtime function; no client, configuration, or optional fallback; bounded ephemeral in-process cache/deduplication only. | User confirmation. |
| Scope exclusions | OI history, events/news, order-book/CVD, and extra price venues are excluded. | User confirmation. |
| New environment variables | `COINALYZE_API_KEY`, optional symbol override, optional direct-provider timeout only. | User confirmation. |
| Secret environments | Vercel Production and Preview; `.env.local` for local development; never public. | User confirmation. |
| Freshness | Core 120 seconds; Coinalyze live 120 seconds/stale 5 minutes; Deribit live 5 minutes/stale 15 minutes. | User confirmation. |
| Testing | Mock-only CI and explicit live local smoke command. | User confirmation. |

## Repository evidence

| Path | Verified fact |
|---|---|
| `src/tools/all.ts` | Registers twelve read-only tools; legacy snapshot tools consume normalized upstream data, while BATS tools already expose history and deterministic features. |
| `src/clients/market-data-client.ts` | Fetches the canonical upstream with one retry, ephemeral cache, timeout, and stale-if-error behavior. |
| `src/normalizers/snapshot.ts` | Normalizes upstream perpetual, liquidation, and options sections; event-level liquidation fields are already nullable. |
| `src/clients/binance-timeframes-client.ts` | Direct Binance Spot fallback probes standard Binance hosts before `data-api.binance.vision`, and existing tests cover HTTP 451 diagnostics. |
| `src/clients/historical-candles-client.ts` | Already fetches 5m/15m/1h/4h/1d Binance or Hyperliquid REST candles, validates history, marks open bars, and supports up to 500 candles. |
| `src/features/indicators.ts` | Already calculates EMA20/50/200, RSI14, MACD, ATR14, ADX14, and DI values from closed candles. |
| `src/features/market-state.ts` | Current `sessionVwap` uses typical price multiplied by base volume and only closed candles; BATS levels include daily and named session VWAPs. |
| `src/services/bats-service.ts` | Existing quality gates treat liquidation as strategy-specific, options/event risk as optional, and core indicators/VWAP as execution-critical. |
| `src/config/env.ts` | Defines current upstream, cache, age, authentication, public URL, host/origin, output-size, and logging configuration but no direct-provider variables. |
| `.env.example` | Documents the current fourteen variables but contains no Coinalyze or direct-provider settings. |
| `README.md` | Provides generic Vercel environment commands but does not enumerate Coinalyze setup or server-only secret handling. |
| `vercel.json` | Caps the MCP function at 15 seconds and the readiness route at 10 seconds. |
| `test/unit/bats-features.test.ts` | Covers deterministic indicators, open-candle exclusion, VWAP partial anchors, pivots, and feature reproducibility. |
| `test/unit/binance-timeframes-client.test.ts` | Covers direct Spot normalization, HTTP 451 diagnostics, and direct fallback replacement. |
| `test/unit/normalization.test.ts` | Covers legacy/enriched completeness, deterministic perpetual fields, timeframe variants, and provider warnings. |
| `docs/bats-market-intelligence/spec.md` | Existing BATS documentation assumes Redis/WebSocket liquidation collectors and Deribit streaming, which conflicts with the newly confirmed REST-only/no-storage direction. |
