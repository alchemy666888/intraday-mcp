# Source Audit: BATS Market Intelligence

**Completed:** 2026-07-30  
**Runtime:** Node.js 20+, TypeScript 5.8, Next.js 15 App Router  
**MCP stack:** `@modelcontextprotocol/sdk` 1.26 with `mcp-handler` 1.1  
**Deployment:** Vercel Node.js function (`app/api/mcp/route.ts`, 15-second deadline)  
**Validation:** Zod 3.25  
**Tests:** Node test runner with `tsx`  
**Persistence:** process-local TTL cache only; no durable store or Redis is currently configured

## Request and registration path

`app/api/mcp/route.ts` authenticates the Streamable HTTP request and delegates to
`registerTools` in `src/mcp/register-tools.ts`. Registration iterates the definitions in
`src/tools/all.ts`; every definition is annotated read-only, non-destructive and idempotent.
Tool results are emitted as both structured content and serialized JSON by
`src/utils/output-limit.ts`.

## Existing tool map

| Tool                        | Handler/orchestrator                              | Service/provider path                                                                                                                                              |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_btc_intraday_snapshot` | `src/tools/all.ts` (`snap`)                       | `src/clients/market-data-client.ts`; optional direct Binance enrichment in `src/clients/binance-timeframes-client.ts`; normalized by `src/normalizers/snapshot.ts` |
| `get_btc_timeframes`        | `src/tools/all.ts` (`filterTimeframesForRequest`) | Same snapshot path plus direct Binance Spot REST enrichment                                                                                                        |
| `get_btc_perpetual_context` | `src/tools/all.ts`                                | Canonical upstream through `market-data-client`; normalized perpetual section                                                                                      |
| `get_btc_liquidations`      | `src/tools/all.ts`                                | Canonical upstream through `market-data-client`; no in-repository collector or Redis repository                                                                    |
| `get_btc_options_surface`   | `src/tools/all.ts`                                | Canonical upstream through `market-data-client`; no in-repository Deribit connection manager                                                                       |
| `get_btc_report_context`    | `src/tools/all.ts`                                | Snapshot orchestration and direct Binance timeframe enrichment                                                                                                     |
| `get_market_data_health`    | `src/tools/all.ts`                                | `market-data-client` and `src/cache/ephemeral-cache.ts` diagnostics                                                                                                |

## Schemas, cache, configuration, and tests

- Upstream wire validation lives in `src/schemas/upstream-v2.ts`.
- Normalized response shapes are constructed in `src/normalizers/snapshot.ts`; the original
  tools do not declare MCP output schemas.
- Request coalescing and fresh/stale cache behavior live in `src/cache/ephemeral-cache.ts`.
- Runtime settings and safe bounds live in `src/config/env.ts`.
- Unit coverage is under `test/unit`; there was no contract, fixture, integration, or
  acceptance-test directory at audit time.

## Provider and storage findings

- The canonical market-data API URL defaults to an external Vercel endpoint and provides the
  Hyperliquid perpetual, liquidation, and Deribit-shaped sections when available.
- Direct Binance Spot REST is the only in-repository venue adapter. It previously fetched only
  two bars for `5m`, `15m`, and `1h`.
- There is no SQL/time-series database, Redis client, background worker runtime, official macro
  provider, news provider, or durable OI history in this deployment.
- Because Vercel request handlers are ephemeral, collector tasks require separately provisioned
  worker and storage infrastructure. Until configured, their sections must degrade explicitly
  rather than be fabricated.

## Integration decision

The first implementation slice will retain all seven handlers, add normalized historical candle
providers and pure deterministic features, then expose the new history, feature, and consolidated
context tools. Supplemental feeds will preserve the existing upstream sections and report narrow
quality-gate failures when collector/history/event infrastructure is unavailable.
