# BTC Intraday Market Data MCP

Read-only Streamable HTTP MCP server for BTC intraday quantitative market data, designed for Vercel Hobby Plan and ChatGPT custom MCP apps.

- Service: `btc-intraday-market-data`
- Version: `1.2.0` (schema `1.1.0`, calculation `bats-1.1.0`)
- Production MCP URL: `https://btc-intraday-mcp.vercel.app/api/mcp` (replace with actual assigned production domain if unavailable)
- Health: `/api/healthz`
- Ready: `/api/readyz`

## Tools

Preferred BATS tools are `get_btc_market_history`, `get_btc_bats_features`,
`get_btc_derivatives_history`, `get_btc_event_risk`, and `get_btc_bats_context`.
The original seven tools remain available without breaking input changes:
`get_btc_intraday_snapshot`, `get_btc_timeframes`, `get_btc_perpetual_context`,
`get_btc_liquidations`, `get_btc_options_surface`, `get_btc_report_context` (compact legacy),
and `get_market_data_health`.

All tools are read-only, idempotent, bounded, and return `structuredContent` plus JSON text fallback. They never place trades, request exchange keys, sign transactions, or produce execution instructions.

## Vercel Hobby note

Vercel Hobby is intended for personal and non-commercial use. Commercial, customer-facing, revenue-generating, team production, or high-volume deployments may require Vercel Pro. This MCP minimizes function duration, bandwidth, invocation count, CPU, and memory, and must fail safely if limits are reached. Usage limits must not be bypassed.

## Environment

Copy `.env.example` to `.env.local` for local defaults. Direct providers use REST-only,
request-driven collection and a bounded 64-entry ephemeral process cache. There is no Redis,
PostgreSQL, database, or durable storage. Provider failure is section-specific: Binance Spot and
Hyperliquid are live through 120 seconds, Coinalyze is stale after 120 seconds and unavailable
after five minutes, and Deribit is stale after five minutes and unavailable after 15 minutes.

`COINALYZE_API_KEY` is a sensitive server-only variable required only for liquidation coverage;
missing or invalid configuration does not disable core readiness. Never use a `NEXT_PUBLIC_*`
name, commit the key, log it, or return it from MCP output. Optional
`COINALYZE_LIQUIDATION_SYMBOLS` controls selected coverage and `DIRECT_PROVIDER_TIMEOUT_MS`
defaults to and is capped at 4000. Public deployments can consume per-instance provider quota.

In Vercel, set all three variables for both Production and Preview with no secret value in source:

```bash
vercel env add COINALYZE_API_KEY production
vercel env add COINALYZE_API_KEY preview
vercel env add COINALYZE_LIQUIDATION_SYMBOLS production
vercel env add COINALYZE_LIQUIDATION_SYMBOLS preview
vercel env add DIRECT_PROVIDER_TIMEOUT_MS production
vercel env add DIRECT_PROVIDER_TIMEOUT_MS preview
```

Or use Vercel Dashboard → Project → Settings → Environment Variables. After production deployment set `MCP_PUBLIC_BASE_URL` and `ALLOWED_HOSTS` to the actual production domain.

## Local development

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

An operator may explicitly run `npm run smoke:providers -- --help` before the opt-in live provider
check. This smoke command is never part of tests, builds, hooks, or CI and prints no credentials.

## ChatGPT installation

Create a custom MCP app named **BTC Intraday Market Data** and configure the remote server URL as `https://<actual-production-domain>/api/mcp`. Initial deployment uses `AUTH_MODE=none`; the endpoint is publicly reachable and third parties could consume Hobby quota. Use bearer mode only after verifying ChatGPT custom MCP bearer support in the UI.
