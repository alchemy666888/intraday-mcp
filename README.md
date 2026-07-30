# BTC Intraday Market Data MCP

Read-only Streamable HTTP MCP server for BTC intraday quantitative market data, designed for Vercel Hobby Plan and ChatGPT custom MCP apps.

- Service: `btc-intraday-market-data`
- Version: `1.1.0`
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

Copy `.env.example` for local defaults. In Vercel, set variables with:

```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
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

## ChatGPT installation

Create a custom MCP app named **BTC Intraday Market Data** and configure the remote server URL as `https://<actual-production-domain>/api/mcp`. Initial deployment uses `AUTH_MODE=none`; the endpoint is publicly reachable and third parties could consume Hobby quota. Use bearer mode only after verifying ChatGPT custom MCP bearer support in the UI.
