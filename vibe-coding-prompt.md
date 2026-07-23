You are an autonomous senior quantitative developer, TypeScript engineer, MCP protocol specialist, Vercel platform engineer, and security-focused API architect.

Build, test, deploy, and document a production-ready, read-only **BTC Intraday Market Data MCP Server from scratch**.

The MCP must be:

1. Implemented as a new standalone repository.
    
2. Hosted in **Vercel Cloud**.
    
3. Compatible with the **Vercel Hobby Plan**.
    
4. Exposed through a stable public HTTPS production URL.
    
5. Installed as a custom MCP app in **ChatGPT**.
    
6. Used by ChatGPT to retrieve live BTC intraday quantitative data.
    
7. Read-only, deterministic, and incapable of placing trades.
    

Do not modify the existing upstream market-data repository.

# Project identity

Use:

```text
Repository name: btc-intraday-mcp
Vercel project name: btc-intraday-mcp
MCP server name: btc-intraday-market-data
ChatGPT app name: BTC Intraday Market Data
Initial version: 1.0.0
Default branch: main
Working branch: codex/vercel-chatgpt-mcp-v1
```

The production MCP endpoint must be:

```text
https://<actual-vercel-production-domain>/api/mcp
```

Also expose:

```text
GET https://<actual-vercel-production-domain>/api/healthz
GET https://<actual-vercel-production-domain>/api/readyz
GET https://<actual-vercel-production-domain>/
```

The root page should identify the service, version, read-only status, health endpoint, and MCP endpoint without exposing secrets or internal diagnostics.

# Mandatory delivery target

This is not a platform-neutral prototype.

The required delivery environment is:

```text
Vercel Cloud
Vercel Hobby Plan
Next.js App Router
Vercel Node.js Functions
Streamable HTTP MCP
ChatGPT custom MCP app
```

The implementation must be designed around Vercel’s serverless execution model.

Do not build an Express server that expects to run continuously.

Do not require:

- A VPS
    
- Docker hosting
    
- Railway
    
- Render
    
- Fly.io
    
- AWS ECS
    
- Google Cloud Run
    
- A persistent Node process
    
- A persistent WebSocket
    
- Localhost tunnelling in production
    

Local development may use the Next.js development server.

Production must use Vercel.

# Hobby Plan usage restriction

Treat this deployment as a personal, non-commercial project suitable for the Vercel Hobby Plan.

Document prominently:

- Vercel Hobby is intended for personal and non-commercial use.
    
- A commercial, customer-facing, revenue-generating, team production, or high-volume deployment may require upgrading to Vercel Pro.
    
- The MCP must be designed to minimize function duration, bandwidth, invocation count, CPU usage, and memory consumption.
    
- Usage limits must not be bypassed or worked around.
    
- The application must fail safely if platform limits are reached.
    

Do not claim that the Hobby Plan provides a commercial production SLA.

# Primary objective

Create a remote MCP server that retrieves, validates, normalizes, and exposes the BTC intraday data produced by:

```text
https://alchemy666888.vercel.app/api/hyperliquid?profile=btc-intraday
```

The MCP must provide ChatGPT with:

- Exact venue-specific 5m volume and VWAP
    
- Exact venue-specific 15m volume and VWAP
    
- Exact venue-specific 1h volume and VWAP
    
- Current Hyperliquid funding rate
    
- Current Hyperliquid open interest
    
- Hyperliquid mark price
    
- Hyperliquid mid price
    
- Hyperliquid oracle price
    
- Rolling 5m liquidation aggregates
    
- Rolling 15m liquidation aggregates
    
- Rolling 1h liquidation aggregates
    
- Liquidation collector coverage metadata
    
- BTC options expiries
    
- BTC options strikes
    
- ATM implied volatility
    
- 25-delta call implied volatility
    
- 25-delta put implied volatility
    
- 25-delta risk-reversal skew
    
- 25-delta butterfly
    
- Options Greeks when supplied upstream
    
- Options open interest when supplied upstream
    
- Explicit source attribution
    
- Explicit venue attribution
    
- Explicit units
    
- Explicit timestamps
    
- Explicit freshness
    
- Explicit completeness
    
- Explicit methodology
    
- Explicit warnings
    
- A compact report-ready context object for ChatGPT
    

The MCP is a data-access and normalization layer.

It must not become:

- A market-data collector
    
- A liquidation collector
    
- An options crawler
    
- A persistent WebSocket consumer
    
- A trading engine
    
- A signal execution engine
    
- An autonomous trading agent
    
- A portfolio manager
    
- An LLM proxy
    

# Required architecture

Use this production architecture:

```text
ChatGPT web
    |
    | Remote MCP over HTTPS
    v
Vercel production deployment
    |
    | /api/mcp
    v
Stateless Vercel Function
    |
    | bounded HTTPS request
    v
Canonical market-data API
    |
    +-- Binance Spot volume and VWAP
    +-- Hyperliquid funding and open interest
    +-- Redis-backed liquidation aggregates
    +-- Deribit options analytics
```

The canonical upstream API remains the source of truth.

The MCP must not duplicate:

- Exchange WebSocket subscriptions
    
- Exchange REST data pipelines
    
- Candle construction
    
- Liquidation aggregation
    
- Options-chain collection
    
- Options delta interpolation already calculated upstream
    
- Persistent storage
    
- Historical market-data storage
    
- Alert processing
    
- Telegram logic
    
- Trade execution
    

The MCP may perform:

- Runtime schema validation
    
- Type-safe normalization
    
- Selection
    
- Filtering
    
- Output size limiting
    
- Freshness evaluation
    
- Deterministic consistency checks
    
- Deterministic report-context formatting
    
- Explicitly permitted lightweight derived calculations
    

# Vercel-native technology stack

Use:

```text
Next.js App Router
TypeScript
Node.js runtime
ES modules
mcp-handler
Official Model Context Protocol TypeScript SDK where required
Zod
Native fetch
Node.js built-in test runner or Vitest
ESLint
Prettier
Vercel CLI
```

At the beginning of implementation:

1. Inspect current official Vercel MCP deployment documentation.
    
2. Inspect the current stable `mcp-handler` documentation.
    
3. Inspect the current stable MCP TypeScript SDK documentation.
    
4. Inspect the current stable Next.js version supported by Vercel.
    
5. Use stable releases only.
    
6. Do not select alpha, beta, release-candidate, canary, or experimental dependencies when a stable option exists.
    
7. Pin exact dependency versions in the lockfile.
    
8. Record selected versions in `docs/architecture.md`.
    

Do not add Express unless the Vercel-recommended MCP handler requires it, which is not expected.

Do not add Axios when native `fetch` is sufficient.

# Required Next.js route layout

Use the App Router.

The MCP route must be implemented at:

```text
app/api/mcp/route.ts
```

Use the Vercel-supported `mcp-handler` integration.

The route must export the methods required by the current stable handler, expected to include:

```ts
export {
  handler as GET,
  handler as POST,
  handler as DELETE,
};
```

Use:

```text
basePath: /api
```

The final MCP URL must therefore be:

```text
https://<production-domain>/api/mcp
```

Explicitly configure the route for the Node.js runtime:

```ts
export const runtime = "nodejs";
```

The MCP route must be dynamic and must not be statically generated.

Use an appropriate configuration such as:

```ts
export const dynamic = "force-dynamic";
```

Configure a bounded function duration compatible with Hobby deployments.

Target:

```text
maxDuration: 15 seconds
```

The actual tool workflow should normally complete in under 8 seconds.

Do not use the maximum platform duration as a substitute for proper timeouts.

# Vercel serverless constraints

The implementation MUST assume:

- Function instances can start cold.
    
- Function instances can be terminated after a request.
    
- Multiple instances can execute concurrently.
    
- Memory is not shared reliably between instances.
    
- In-memory state may disappear at any time.
    
- Local filesystem writes are not durable.
    
- A subsequent request may execute in a different region or instance.
    
- Background work after the response is not guaranteed.
    
- Persistent sockets are inappropriate for this MCP.
    
- A module-level cache is only a best-effort optimization.
    

Correctness must not depend on:

- A warm function instance
    
- In-memory session state
    
- In-memory cache persistence
    
- In-memory rate-limit counters
    
- Local files
    
- A persistent MCP session
    
- A background polling loop
    
- A long-running timer
    
- A WebSocket remaining open
    

Use a stateless Streamable HTTP MCP design.

Each tool request must be independently processable.

# Function performance budget

Apply the following request budget:

```text
Overall MCP tool deadline: 8,500 ms
Upstream timeout: 6,000 ms
Retry budget: one retry only when sufficient deadline remains
Schema validation and normalization: under 500 ms
Serialization: under 250 ms
Safety margin: at least 1,500 ms
```

Use one shared upstream fetch per MCP tool invocation.

Do not fetch the upstream API separately for each output section.

For example, `get_btc_intraday_snapshot` must issue one upstream request and derive all requested sections from that validated response.

Use `AbortController`.

Abort upstream work when the client disconnects where the runtime permits.

# Project structure

Create a structure similar to:

```text
btc-intraday-mcp/
  app/
    page.tsx

    api/
      mcp/
        route.ts

      healthz/
        route.ts

      readyz/
        route.ts

  src/
    config/
      env.ts

    mcp/
      register-tools.ts
      annotations.ts
      tool-result.ts

    clients/
      market-data-client.ts

    cache/
      ephemeral-cache.ts

    schemas/
      common.ts
      upstream-legacy.ts
      upstream-v2.ts
      normalized.ts
      tool-inputs.ts
      tool-outputs.ts

    normalizers/
      snapshot.ts
      timeframes.ts
      perpetual.ts
      liquidations.ts
      options.ts
      quality.ts
      report-context.ts

    tools/
      get-btc-intraday-snapshot.ts
      get-btc-timeframes.ts
      get-btc-perpetual-context.ts
      get-btc-liquidations.ts
      get-btc-options-surface.ts
      get-btc-report-context.ts
      get-market-data-health.ts

    security/
      auth.ts
      timing-safe.ts
      headers.ts
      redact.ts

    observability/
      logger.ts
      request-context.ts

    utils/
      abort.ts
      deadline.ts
      finite-number.ts
      timestamps.ts
      retry.ts
      errors.ts
      output-limit.ts

  test/
    fixtures/
      enriched-complete.json
      enriched-partial.json
      enriched-stale.json
      legacy-only.json
      malformed.json

    unit/
    integration/
    protocol/
    vercel/

  docs/
    requirements.md
    architecture.md
    tool-catalog.md
    data-contract.md
    vercel-deployment.md
    chatgpt-installation.md
    operations.md
    security.md

  scripts/
    inspect.ts
    smoke-local.ts
    smoke-production.ts
    verify-chatgpt-contract.ts

  public/
    favicon.ico

  .env.example
  .gitignore
  eslint.config.js
  next.config.ts
  package.json
  package-lock.json
  prettier.config.js
  README.md
  TASKS.md
  tsconfig.json
  vercel.json
```

The exact structure may be adjusted when justified.

Transport code, upstream access, normalization, tool logic, and schemas must remain separated.

# Environment configuration

Support:

```text
MARKET_DATA_API_URL
MARKET_DATA_PROFILE
UPSTREAM_TIMEOUT_MS
UPSTREAM_MAX_RETRIES
UPSTREAM_CACHE_TTL_MS
UPSTREAM_STALE_IF_ERROR_MS
MAX_ACCEPTABLE_DATA_AGE_MS
MAX_TOOL_RESULT_BYTES
AUTH_MODE
MCP_BEARER_TOKEN
MCP_PUBLIC_BASE_URL
ALLOWED_HOSTS
ALLOWED_ORIGINS
LOG_LEVEL
```

Defaults:

```text
MARKET_DATA_API_URL=https://alchemy666888.vercel.app/api/hyperliquid
MARKET_DATA_PROFILE=btc-intraday
UPSTREAM_TIMEOUT_MS=6000
UPSTREAM_MAX_RETRIES=1
UPSTREAM_CACHE_TTL_MS=3000
UPSTREAM_STALE_IF_ERROR_MS=30000
MAX_ACCEPTABLE_DATA_AGE_MS=120000
MAX_TOOL_RESULT_BYTES=500000
AUTH_MODE=none
LOG_LEVEL=info
```

Build the upstream URL using the URL API.

Resolve it to:

```text
${MARKET_DATA_API_URL}?profile=${MARKET_DATA_PROFILE}
```

Preserve existing safe query parameters.

Do not concatenate raw user input into URLs.

Do not expose environment variables through any endpoint.

# Vercel environment variables

Provide exact documentation for setting variables using:

```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
```

Also document how to configure them in:

```text
Vercel Dashboard
→ Project
→ Settings
→ Environment Variables
```

Do not commit `.env.local`.

Create `.env.example` containing names and safe example values only.

After deployment, set:

```text
MCP_PUBLIC_BASE_URL=https://<actual-production-domain>
ALLOWED_HOSTS=<actual-production-domain>
```

Do not leave placeholder production domains in the deployed environment.

# Authentication strategy for ChatGPT

The MCP only returns public, read-only market data.

Implement:

```text
AUTH_MODE=none
AUTH_MODE=bearer
```

Use `AUTH_MODE=none` as the initial ChatGPT-compatible deployment mode unless the current ChatGPT custom-app setup supports and is configured with the bearer mechanism.

When authentication is disabled:

- Expose only non-sensitive public market information.
    
- Keep every tool read-only.
    
- Apply strict output limits.
    
- Apply bounded request processing.
    
- Do not expose internal diagnostics.
    
- Do not expose environment configuration.
    
- Document that the endpoint is publicly reachable.
    
- Document the risk of unauthorized third-party calls consuming Hobby usage.
    

When bearer mode is enabled:

- Require `Authorization: Bearer <token>`.
    
- Compare tokens using `crypto.timingSafeEqual`.
    
- Hash or redact token identifiers in logs.
    
- Never put the token in a URL.
    
- Never log the token.
    
- Never expose the token to tool handlers.
    
- Fail startup or readiness when the token is missing.
    
- Return generic unauthorized errors.
    

Keep authentication behind an interface so standards-compliant OAuth can be added later.

Do not implement a homemade OAuth authorization server.

Do not claim that bearer authentication works in ChatGPT unless it has been tested through the current ChatGPT custom-app installation UI.

# Production endpoint accessibility

The production MCP endpoint must be reachable by ChatGPT over public HTTPS.

Do not leave the production deployment behind:

- Vercel account login
    
- Preview deployment protection
    
- Basic authentication
    
- A private network
    
- An IP allow-list that excludes ChatGPT
    
- A localhost tunnel
    
- An expiring preview URL
    

Preview deployments may remain protected.

The production deployment used by ChatGPT must have a stable domain.

Prefer:

```text
https://btc-intraday-mcp.vercel.app/api/mcp
```

Use the actual assigned domain if this slug is unavailable.

Record the final URL in:

```text
README.md
docs/vercel-deployment.md
docs/chatgpt-installation.md
```

# Canonical upstream response support

Support both enriched and legacy responses.

## Enriched response

Expected shape:

```json
{
  "schemaVersion": "2.0",
  "timestamp": "",
  "interval": "4h",
  "source": "hyperliquid",
  "prices": {},
  "assets": [],
  "btcIntraday": {
    "symbol": "BTCUSDT",
    "asOf": "",
    "timeframes": {
      "5m": {},
      "15m": {},
      "1h": {}
    },
    "perpetual": {},
    "liquidations": {},
    "options": {},
    "quality": {}
  },
  "status": "success",
  "persistence": {},
  "alerts": {}
}
```

## Legacy response

The upstream may temporarily return:

```json
{
  "timestamp": "",
  "interval": "4h",
  "source": "hyperliquid",
  "prices": {},
  "assets": [],
  "status": "success",
  "persistence": {},
  "alerts": {}
}
```

When `btcIntraday` is absent:

- Do not fabricate enriched metrics.
    
- Do not calculate exact VWAP from legacy OHLC.
    
- Do not infer liquidations.
    
- Do not infer IV.
    
- Do not infer skew.
    
- Do not claim the enriched profile succeeded.
    
- Return `status: "unavailable"` for enriched sections.
    
- Return unavailable numeric fields as `null`.
    
- Include a machine-readable warning.
    
- Include trustworthy legacy BTC context only under `legacyContext`.
    
- Preserve venue labels.
    

# Canonical normalized schema

Use:

```ts
type DataStatus =
  | "live"
  | "stale"
  | "partial"
  | "unavailable"
  | "error";
```

Every provider block must include:

```json
{
  "source": "",
  "venue": "",
  "asOf": "",
  "receivedAt": "",
  "ageMs": 0,
  "status": "live",
  "method": "",
  "reason": null,
  "warnings": []
}
```

Every unavailable numeric field must be:

```json
null
```

Never use zero as a missing-data fallback.

Validate every numeric value using `Number.isFinite`.

Reject or nullify:

- `NaN`
    
- `Infinity`
    
- `-Infinity`
    
- Unparseable numeric strings
    
- Negative volume
    
- Negative open interest
    
- Negative option strike
    
- Negative event count
    
- Invalid timestamps
    

Preserve legitimate negative values for:

- Funding
    
- Skew
    
- Risk reversal
    
- Theta
    
- Valid negative Greeks
    

Use UTC ISO-8601 timestamps.

# Market-data semantics

## Timeframe metrics

Timeframe volume and VWAP originate from Binance Spot BTCUSDT.

Expose:

```text
baseVolumeBtc
quoteVolumeUsd
vwapUsd
tradeCount
takerBuyBaseVolumeBtc
takerBuyQuoteVolumeUsd
```

Expose when supplied:

```text
currentBar
closedBar
```

Do not call this Hyperliquid volume.

Do not recompute VWAP using OHLC.

Permitted fallback only when base and quote volume are supplied:

```text
vwapUsd = quoteVolumeUsd / baseVolumeBtc
```

Only calculate when:

```text
baseVolumeBtc > 0
```

## Hyperliquid perpetual metrics

Expose:

```text
markPriceUsd
midPriceUsd
oraclePriceUsd
fundingRateHourly
fundingAprSimple
openInterestBtc
openInterestUsd
```

Permitted deterministic calculations:

```text
fundingAprSimple = fundingRateHourly * 24 * 365
openInterestUsd = openInterestBtc * markPriceUsd
```

Mark any MCP-side calculation explicitly.

Do not relabel hourly funding as eight-hour funding.

## Liquidations

Expose for 5m, 15m, and 1h:

```text
longLiquidationUsd
shortLiquidationUsd
totalLiquidationUsd
eventCount
largestLiquidationUsd
lastEventAt
```

Always include:

```text
source
venue
exactness
collectorConnected
collectorLastEventAt
coverageStartAt
status
warnings
```

Do not describe liquidation aggregates as global unless the upstream explicitly guarantees global coverage.

Do not convert unavailable liquidation metrics to zero.

## Options

Expose:

```text
expiration
expirationTimestamp
daysToExpiry
underlyingPriceUsd
atmStrikeUsd
atmIvPct
call25DeltaIvPct
put25DeltaIvPct
riskReversal25dVolPoints
butterfly25dVolPoints
selectionMethod
selectedInstruments
warnings
strikes
```

Normalize IV to percentage points.

Use:

```text
riskReversal25dVolPoints =
  call25DeltaIvPct - put25DeltaIvPct
```

Use:

```text
butterfly25dVolPoints =
  ((call25DeltaIvPct + put25DeltaIvPct) / 2) - atmIvPct
```

Return `null` when required components are missing.

Do not estimate implied volatility using historical volatility.

# Required MCP tools

Implement exactly these seven initial tools:

```text
get_btc_intraday_snapshot
get_btc_timeframes
get_btc_perpetual_context
get_btc_liquidations
get_btc_options_surface
get_btc_report_context
get_market_data_health
```

Every tool must be:

- Read-only
    
- Idempotent
    
- Deterministic for a given upstream snapshot
    
- Strictly validated
    
- Bounded in output size
    
- Safe for ChatGPT use
    
- Explicit about missing data
    
- Explicit about venue and source
    
- Explicit about timestamps
    

Use tool annotations where supported:

```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": true
}
```

Every tool must return:

```text
structuredContent
content
```

`structuredContent` must satisfy the declared output schema.

`content` must contain a concise JSON representation.

# Tool definitions

## `get_btc_intraday_snapshot`

Return the complete normalized snapshot.

Input:

```json
{
  "timeframes": ["5m", "15m", "1h"],
  "barSelection": "both",
  "includeOptionsStrikes": false,
  "maxOptionsExpiries": 3,
  "maxStrikesPerExpiry": 12,
  "maxAgeMs": 120000,
  "strict": false
}
```

Limits:

```text
maxOptionsExpiries: 1–6
maxStrikesPerExpiry: 0–50
maxAgeMs: 1,000–3,600,000
```

## `get_btc_timeframes`

Return selected 5m, 15m, and 1h volume/VWAP data.

Input:

```json
{
  "timeframes": ["5m", "15m", "1h"],
  "barSelection": "both",
  "maxAgeMs": 120000
}
```

## `get_btc_perpetual_context`

Return Hyperliquid price, funding, and open-interest data.

Input:

```json
{
  "includeAnnualizedFunding": true,
  "maxAgeMs": 120000
}
```

## `get_btc_liquidations`

Return rolling liquidation aggregates and collector coverage.

Input:

```json
{
  "windows": ["5m", "15m", "1h"],
  "maxAgeMs": 120000
}
```

## `get_btc_options_surface`

Return selected options expiries, IV, skew, Greeks, OI, and optional strikes.

Input:

```json
{
  "maxExpiries": 3,
  "includeStrikes": true,
  "maxStrikesPerExpiry": 20,
  "minimumOpenInterest": 0,
  "maxAgeMs": 300000
}
```

Sort expiries chronologically.

Sort strikes numerically.

Limit strike output before serialization.

## `get_btc_report_context`

Return compact quantitative inputs optimized for ChatGPT report generation.

Input:

```json
{
  "timeframes": ["5m", "15m", "1h"],
  "includeOptions": true,
  "includeLiquidations": true,
  "maxOptionsExpiries": 3,
  "maxAgeMs": 120000
}
```

Output must include:

```json
{
  "asOf": "",
  "market": "BTC",
  "spotReferenceUsd": null,
  "intraday": {},
  "perpetual": {},
  "liquidations": {},
  "optionsSummary": {},
  "crossMarketObservations": {},
  "quality": {},
  "warnings": [],
  "reportInstructions": {
    "mustStateUnavailableData": true,
    "mustPreserveVenueLabels": true,
    "mustStateTimestamp": true,
    "mustAvoidFabricatedPrecision": true
  }
}
```

Permitted deterministic observations include:

- Current close minus current VWAP
    
- Current close minus closed-bar VWAP
    
- Hyperliquid mark minus Binance VWAP
    
- Mark premium in basis points
    
- Long/short liquidation imbalance
    
- Funding direction
    
- OI availability
    
- Options risk-reversal sign
    
- Options butterfly sign
    
- Data completeness flags
    

Do not generate:

- Buy recommendations
    
- Sell recommendations
    
- Entry prices
    
- Stop losses
    
- Take-profit levels
    
- Position sizes
    
- Leverage
    
- Trade execution instructions
    
- Price forecasts
    
- Probability claims
    
- Narrative reports
    

## `get_market_data_health`

Return:

- MCP version
    
- Deployment environment
    
- Upstream reachability
    
- Upstream response latency
    
- Upstream schema type
    
- Last successful fetch timestamp
    
- Freshness
    
- Cache status
    
- Tool count
    
- Overall readiness
    

Input:

```json
{
  "includeDiagnostics": false
}
```

Do not expose secrets, environment values, stack traces, files, or full payloads.

# ChatGPT tool-selection quality

Tool names and descriptions must help ChatGPT select the correct tool.

Descriptions must explain:

- What the tool returns
    
- When ChatGPT should use it
    
- What the tool does not return
    
- Which venue supplies each metric
    
- Whether options strikes are included
    
- Whether the output is compact or comprehensive
    

Avoid overlapping descriptions.

Do not create aliases or duplicate tools.

Keep tool inputs stable after ChatGPT installation.

Any future breaking change to:

- Tool names
    
- Required inputs
    
- Input types
    
- Output semantics
    

must require a major MCP version and ChatGPT app refresh or recreation.

Prefer backward-compatible changes such as adding optional fields.

# Upstream client

Implement one serverless-safe market-data client.

Requirements:

- Native `fetch`
    
- AbortController
    
- Deadline propagation
    
- Configurable timeout
    
- At most one retry
    
- Retry only safe transient failures
    
- Request deduplication within the active function instance
    
- Small ephemeral TTL cache
    
- Bounded stale-if-error support
    
- No persistent cache requirement
    
- No background refresh
    
- No polling loop
    

Retry only:

```text
network reset
timeout when deadline remains
HTTP 429
HTTP 502
HTTP 503
HTTP 504
```

Do not retry:

```text
HTTP 400
HTTP 401
HTTP 403
HTTP 404
schema validation failure
```

Respect `Retry-After` only when it fits within the remaining function deadline.

# Ephemeral cache rules

A module-level cache may be used as a best-effort optimization.

It must not be treated as durable or globally consistent.

Cache entries must include:

```text
payload
fetchedAt
expiresAt
staleUntil
upstreamStatus
```

When stale cache is used:

- Mark the result `stale`.
    
- Report actual age.
    
- Add a warning.
    
- Never label it live.
    

Tests must prove that the application remains correct when the cache is empty on every request.

Do not add Redis or Vercel KV solely for MCP caching in version 1.

# Freshness rules

Calculate freshness from source timestamps.

Use:

```text
ageMs = receivedAt - asOf
```

Allowed status:

```text
live
stale
partial
unavailable
error
```

Rules:

```text
live:
  requested data is present and ageMs <= maxAgeMs

stale:
  data exists but ageMs > maxAgeMs

partial:
  one or more requested sections are missing

unavailable:
  no usable data exists for the section

error:
  data cannot be safely parsed
```

Do not hide stale data behind `live`.

# Strict mode

For tools supporting `strict: true`, return a safe MCP tool error when a required requested section is:

- Missing
    
- Unavailable
    
- Invalid
    
- Error
    
- Older than `maxAgeMs`
    

Return a machine-readable list of failed sections.

Do not return a stack trace.

# Output-size control

Set:

```text
MAX_TOOL_RESULT_BYTES=500000
```

Before serialization:

1. Preserve summary metrics.
    
2. Reduce optional strikes deterministically.
    
3. Preserve expiry-level analytics.
    
4. Add a truncation warning.
    
5. Report original and returned strike counts.
    

Never truncate raw JSON bytes.

Never return an unbounded options chain.

# Health endpoints

## `/api/healthz`

Must not contact upstream services.

Return:

```json
{
  "status": "ok",
  "service": "btc-intraday-market-data",
  "version": "1.0.0",
  "platform": "vercel"
}
```

## `/api/readyz`

Perform a lightweight bounded readiness evaluation.

Check:

- Environment configuration
    
- MCP tool registration
    
- Upstream URL validity
    
- A recent successful upstream result or one short upstream request
    

Return HTTP 200 when ready.

Return HTTP 503 when not ready.

Do not include full upstream data.

# Root page

Create a minimal static or server-rendered landing page at `/`.

Display:

```text
BTC Intraday Market Data MCP
Read-only
Hosted on Vercel
MCP endpoint: /api/mcp
Health endpoint: /api/healthz
Readiness endpoint: /api/readyz
```

Do not display environment values.

Do not display the bearer token.

Do not build an interactive trading dashboard.

# HTTP security

Implement:

- Production HTTPS assumption
    
- Exact production host allow-list
    
- Safe Vercel preview-host handling for previews
    
- Restricted CORS
    
- Body-size limit
    
- Generic production errors
    
- Safe request IDs
    
- Security headers
    
- Redacted structured logs
    
- Content-type validation
    
- Method validation
    

Do not use wildcard CORS in production.

Do not trust arbitrary forwarded client IP headers.

Do not expose internal error details.

# Rate and resource protection

Because Hobby instances are distributed and ephemeral, do not claim that an in-memory limiter provides global protection.

Implement at least:

- Per-instance soft rate limiting
    
- Concurrent upstream request deduplication
    
- Maximum output size
    
- Maximum tool input ranges
    
- Maximum upstream response size
    
- Maximum request body size
    
- Maximum tool execution deadline
    

Document that strong global rate limiting requires an external shared store or Vercel platform-level protection.

Do not add paid infrastructure merely to satisfy version 1.

When `AUTH_MODE=none`, document the possibility that third parties could consume Hobby invocation quota.

# Observability

Use structured JSON logging compatible with Vercel Logs.

Include:

```text
timestamp
level
requestId
vercelEnvironment
method
path
toolName
durationMs
upstreamDurationMs
upstreamStatus
cacheStatus
resultStatus
```

When available, include safe Vercel identifiers such as deployment environment without logging secrets.

Do not log:

- Authorization values
    
- Tokens
    
- Cookies
    
- Full MCP request bodies
    
- Full upstream payloads
    
- Full options chains
    
- Environment dumps
    
- Internal stack traces in responses
    

# Error taxonomy

Create typed errors:

```text
ConfigurationError
AuthenticationError
RateLimitError
DeadlineExceededError
UpstreamTimeoutError
UpstreamHttpError
UpstreamSchemaError
DataUnavailableError
StaleDataError
ToolInputError
OutputLimitError
InternalInvariantError
```

Each error must contain:

```text
code
safeMessage
retryable
cause
safeDetails
```

Only safe fields may leave the server.

# Data consistency checks

Add warnings for:

- Future source timestamps beyond tolerance
    
- Closed bars with future close times
    
- VWAP outside high/low beyond tolerance
    
- Total liquidations inconsistent with long plus short
    
- OI USD inconsistent with BTC OI multiplied by mark
    
- Funding APR inconsistent with hourly funding
    
- Expired options included as active
    
- Non-positive strikes
    
- Negative IV
    
- Options expiry without usable strikes
    
- Source labelled live when older than threshold
    

Warnings must not fabricate replacements.

# MUST-HAVEs

The delivered system MUST include all of the following.

## Vercel delivery

- New standalone Git repository
    
- Next.js App Router
    
- `mcp-handler`
    
- Vercel Node.js runtime
    
- MCP route at `app/api/mcp/route.ts`
    
- Production endpoint at `/api/mcp`
    
- Vercel Hobby-compatible implementation
    
- `vercel.json`
    
- Vercel environment-variable documentation
    
- Preview deployment
    
- Production deployment
    
- Stable production URL
    
- Production smoke test
    
- Vercel deployment logs checked
    
- No persistent-process dependency
    
- No durable local-state dependency
    
- No protected production endpoint that blocks ChatGPT
    

## ChatGPT delivery

- ChatGPT-compatible remote Streamable HTTP MCP
    
- Read-only MCP tools
    
- Stable tool names
    
- Strict input schemas
    
- Strict output schemas
    
- Tool scan compatibility
    
- Installation documentation
    
- Exact production MCP URL
    
- ChatGPT Developer Mode setup instructions
    
- Tool scanning instructions
    
- Test prompts
    
- Expected tool-selection behavior
    
- Manual installation verification checklist
    
- Documentation for refreshing tool definitions after changes
    

## Protocol

- MCP initialization
    
- `tools/list`
    
- `tools/call`
    
- Structured content
    
- Text fallback
    
- Read-only annotations
    
- Safe errors
    
- Stateless request handling
    
- Protocol-level automated tests
    
- MCP Inspector verification
    

## Data

- Enriched schema validation
    
- Legacy schema detection
    
- Null-based missing data
    
- Venue labels
    
- Units
    
- Source timestamps
    
- Receipt timestamps
    
- Age calculation
    
- Freshness status
    
- Completeness status
    
- Warnings
    
- Deterministic normalization
    
- Output size limits
    

## Tools

- `get_btc_intraday_snapshot`
    
- `get_btc_timeframes`
    
- `get_btc_perpetual_context`
    
- `get_btc_liquidations`
    
- `get_btc_options_surface`
    
- `get_btc_report_context`
    
- `get_market_data_health`
    

## Reliability

- Upstream timeout
    
- Overall deadline
    
- One bounded retry
    
- Request deduplication
    
- Ephemeral caching
    
- Stale-if-error handling
    
- Partial-response handling
    
- No uncaught promise rejections
    
- Health endpoint
    
- Readiness endpoint
    
- Safe production errors
    

## Security

- Environment validation
    
- Optional bearer auth
    
- Timing-safe token comparison
    
- Restricted CORS
    
- Host validation
    
- Body-size limits
    
- Redacted logs
    
- No secrets committed
    
- No private market/account data
    
- No exchange credentials
    
- No internal stack traces
    

## Engineering quality

- TypeScript strict mode
    
- Runtime validation
    
- No uncontrolled `any`
    
- Unit tests
    
- Integration tests
    
- MCP protocol tests
    
- Vercel route tests
    
- Fixture-based tests
    
- No live network dependency in automated tests
    
- Linting
    
- Formatting
    
- Type checking
    
- Build verification
    
- Local smoke test
    
- Production smoke test
    
- Complete README
    
- Architecture documentation
    
- Vercel deployment documentation
    
- ChatGPT installation documentation
    
- Security documentation
    
- Data-contract documentation
    

# NOT-TO-DO

The implementation MUST NOT do any of the following.

## Trading

- Do not place orders.
    
- Do not cancel orders.
    
- Do not modify orders.
    
- Do not expose write tools.
    
- Do not request exchange API keys.
    
- Do not request wallet keys.
    
- Do not sign transactions.
    
- Do not manage positions.
    
- Do not recommend leverage.
    
- Do not implement execution.
    

## Data fabrication

- Do not invent missing numbers.
    
- Do not use zero for unavailable data.
    
- Do not calculate VWAP from OHLC.
    
- Do not infer liquidations from OI changes.
    
- Do not infer IV from historical volatility.
    
- Do not infer skew from funding.
    
- Do not mix venue attribution.
    
- Do not relabel stale data as live.
    
- Do not remove upstream limitations.
    
- Do not claim liquidation data is global without evidence.
    

## Vercel architecture

- Do not create a persistent WebSocket.
    
- Do not create a background poller.
    
- Do not run a permanent Node server.
    
- Do not depend on warm instances.
    
- Do not depend on module memory for correctness.
    
- Do not write persistent files.
    
- Do not use local SQLite.
    
- Do not add a database.
    
- Do not add Redis for MCP caching in version 1.
    
- Do not create Vercel Cron jobs for live data.
    
- Do not use Edge runtime unless MCP compatibility is proven.
    
- Do not force Vercel into an unsupported streaming model.
    
- Do not deploy to another hosting provider.
    

## ChatGPT integration

- Do not expose localhost URLs in final documentation.
    
- Do not use an expiring tunnel as production.
    
- Do not leave the MCP behind Vercel login protection.
    
- Do not claim the ChatGPT app is installed unless manually verified.
    
- Do not change tool names after installation without documenting refresh requirements.
    
- Do not create write or modify actions.
    
- Do not rely on ChatGPT retaining state between tool calls.
    
- Do not return only prose when structured output is available.
    

## Dependencies

- Do not use prerelease packages unnecessarily.
    
- Do not use floating dependency versions.
    
- Do not use `latest` in `package.json`.
    
- Do not add Axios.
    
- Do not add Express without justification.
    
- Do not add WebSocket libraries.
    
- Do not add database clients.
    
- Do not add a message queue.
    
- Do not bypass the lockfile.
    

## Security

- Do not hard-code tokens.
    
- Do not commit `.env.local`.
    
- Do not log secrets.
    
- Do not put tokens in URLs.
    
- Do not enable wildcard production CORS.
    
- Do not expose environment values.
    
- Do not disable TLS verification.
    
- Do not implement custom cryptography.
    
- Do not implement homemade OAuth.
    
- Do not return detailed internal errors.
    

## Scope

- Do not modify the upstream API repository.
    
- Do not duplicate market collection.
    
- Do not call an LLM from the MCP.
    
- Do not generate narrative reports inside MCP tools.
    
- Do not create an interactive UI.
    
- Do not add trading signals.
    
- Do not leave required TODO placeholders.
    
- Do not claim completion when production deployment or tests failed.
    

# Automated tests

No automated test may require internet access.

## Unit tests

Test:

- Environment parsing
    
- Vercel environment detection
    
- URL construction
    
- Timeout enforcement
    
- Deadline propagation
    
- Retry classification
    
- Retry limit
    
- Ephemeral cache behavior
    
- Cache loss between simulated instances
    
- Request deduplication
    
- Numeric validation
    
- Timestamp validation
    
- Freshness classification
    
- Legacy schema detection
    
- Enriched schema validation
    
- Complete normalization
    
- Partial normalization
    
- Venue attribution
    
- VWAP fallback
    
- Funding APR
    
- OI USD
    
- Liquidation consistency
    
- Options sorting
    
- IV units
    
- Risk reversal
    
- Butterfly
    
- Output size reduction
    
- Log redaction
    
- Bearer-token verification
    

## Integration tests

Test:

- Complete upstream fixture
    
- Partial upstream fixture
    
- Legacy upstream fixture
    
- Malformed response
    
- HTTP 429
    
- HTTP 500
    
- Timeout
    
- Retryable failure
    
- Non-retryable failure
    
- Stale fallback
    
- Strict-mode failure
    
- Non-strict partial success
    
- Authentication enabled
    
- Authentication disabled
    
- Health route
    
- Readiness route
    
- Root page
    
- MCP route methods
    

## MCP protocol tests

Test:

- Initialization
    
- Capabilities
    
- Tool listing
    
- All seven tools appear once
    
- Input schemas exist
    
- Output schemas exist
    
- Valid calls
    
- Invalid calls
    
- Unknown tool
    
- Structured content validation
    
- Text fallback
    
- Partial success
    
- Strict failure
    
- Concurrent tool calls
    
- Stateless calls
    
- Graceful handler completion
    

## Vercel tests

Verify:

- `next build` succeeds
    
- App Router route compilation succeeds
    
- Node runtime is selected
    
- No Edge-only dependency is required
    
- No server-only secret enters client bundles
    
- MCP route remains dynamic
    
- Function completes within deadline
    
- Bundle size is reasonable
    
- Production environment configuration is valid
    

# Package scripts

Provide:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "inspect": "tsx scripts/inspect.ts",
    "smoke:local": "tsx scripts/smoke-local.ts",
    "smoke:production": "tsx scripts/smoke-production.ts",
    "check": "npm run format:check && npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

Adjust only when required by the selected stable tooling.

`npm run check` must pass.

# Vercel deployment process

Perform these steps.

## 1. Local verification

Run:

```bash
npm ci
npm run check
npm run dev
npm run smoke:local
```

Use MCP Inspector against:

```text
http://localhost:3000/api/mcp
```

Verify all seven tools.

## 2. Vercel project creation

Use Vercel CLI or Git integration.

Expected commands:

```bash
vercel link
vercel
```

Create or link the project:

```text
btc-intraday-mcp
```

Confirm the account is on the intended Hobby scope.

Do not deploy to an unintended organization or paid team.

## 3. Configure environment variables

Configure Development, Preview, and Production environments.

At minimum:

```text
MARKET_DATA_API_URL
MARKET_DATA_PROFILE
UPSTREAM_TIMEOUT_MS
MAX_ACCEPTABLE_DATA_AGE_MS
MAX_TOOL_RESULT_BYTES
AUTH_MODE
LOG_LEVEL
```

After obtaining the production domain, configure:

```text
MCP_PUBLIC_BASE_URL
ALLOWED_HOSTS
```

Redeploy after setting the final domain values.

## 4. Preview verification

Deploy preview:

```bash
vercel
```

Run smoke tests against the preview URL.

It is acceptable for preview deployment protection to remain enabled.

Do not use the preview URL as the ChatGPT production app URL.

## 5. Production deployment

Deploy:

```bash
vercel --prod
```

Capture the actual production URL.

Verify:

```text
/
 /api/healthz
 /api/readyz
 /api/mcp
```

Check Vercel logs for:

- Runtime exceptions
    
- Timeouts
    
- Repeated retries
    
- Schema failures
    
- Secret leakage
    
- Excessive payloads
    

## 6. Production smoke test

Run:

```bash
MCP_PRODUCTION_URL=https://<actual-domain>/api/mcp \
npm run smoke:production
```

Use MCP Inspector against the production endpoint.

Confirm:

- Initialization succeeds.
    
- Tool scanning succeeds.
    
- Every required tool appears.
    
- Every tool can be called.
    
- Legacy upstream data produces honest partial output.
    
- No tool times out.
    
- No write tool is exposed.
    

# ChatGPT installation

Create:

```text
docs/chatgpt-installation.md
```

The instructions must target ChatGPT web.

Before installation, verify that the user’s current ChatGPT plan and workspace permissions support custom MCP apps in Developer Mode.

Use the actual production endpoint:

```text
https://<actual-vercel-production-domain>/api/mcp
```

Document the current installation process:

1. Open ChatGPT on the web.
    
2. Open Settings.
    
3. Open Apps.
    
4. Enable Developer Mode from Advanced Settings when available.
    
5. For managed workspaces, confirm the admin has enabled custom MCP apps.
    
6. Select Create App or Create Custom App.
    
7. Enter:
    

```text
Name: BTC Intraday Market Data
Description: Read-only BTC intraday market data, derivatives context, liquidations and options analytics.
MCP endpoint: https://<actual-vercel-production-domain>/api/mcp
Authentication: None for the initial public read-only deployment
```

8. Select Scan Tools.
    
9. Confirm exactly seven tools are discovered.
    
10. Review every tool and verify that each is read-only.
    
11. Create the app.
    
12. Enable the app.
    
13. Start a new chat.
    
14. Select `BTC Intraday Market Data` from the tools or apps menu.
    
15. Run the validation prompts below.
    

Do not use localhost or a preview URL.

Do not publish the app to a workspace until it has been reviewed.

# ChatGPT validation prompts

Document and manually test these prompts.

## Tool discovery

```text
Using the BTC Intraday Market Data app, list which BTC market-data sections are currently available and state their venues and timestamps.
```

Expected behavior:

- ChatGPT calls an appropriate read-only tool.
    
- ChatGPT states missing data.
    
- ChatGPT preserves source attribution.
    

## Intraday bars

```text
Use the BTC Intraday Market Data app to compare BTC 5m, 15m and 1h current price against venue VWAP. State whether each bar is current or closed.
```

## Funding and OI

```text
Get the current Hyperliquid BTC funding rate and open interest. Include units, timestamp and freshness.
```

## Liquidations

```text
Show BTC long and short liquidation aggregates for 5m, 15m and 1h. State the exact coverage limitation.
```

## Options

```text
Get the nearest BTC options expiries, ATM IV, 25-delta risk reversal and butterfly. State the options venue and IV units.
```

## Full report context

```text
Retrieve a compact BTC intraday report context. Do not provide a trade recommendation. Explicitly list unavailable or stale data.
```

# ChatGPT installation verification record

Create a checklist in the documentation:

```text
[ ] Production MCP URL is public HTTPS
[ ] ChatGPT Developer Mode is enabled
[ ] App creation succeeds
[ ] Tool scan succeeds
[ ] Exactly seven tools appear
[ ] All tools are read-only
[ ] Snapshot tool works
[ ] Timeframes tool works
[ ] Perpetual tool works
[ ] Liquidations tool works
[ ] Options tool works
[ ] Report-context tool works
[ ] Health tool works
[ ] Missing data is disclosed
[ ] Venue attribution is preserved
[ ] No write confirmation appears
```

Codex must not mark ChatGPT UI steps complete unless they were actually performed by an authorized user.

When Codex cannot access the ChatGPT UI, it must:

1. Complete deployment.
    
2. Provide the exact production endpoint.
    
3. Complete protocol and Inspector verification.
    
4. Leave only the manual ChatGPT installation checklist unchecked.
    
5. Clearly state that manual ChatGPT installation remains.
    

# Tool schema lifecycle

ChatGPT may retain an approved snapshot of tool definitions.

Therefore:

- Treat tool names as a stable public API.
    
- Avoid breaking input changes.
    
- Add new inputs as optional.
    
- Do not rename tools after installation.
    
- Document how to refresh or recreate the ChatGPT app after tool-schema changes.
    
- Increment the MCP major version for breaking changes.
    
- Retest tool scanning after every production schema change.
    

# Documentation

Create a complete `README.md` covering:

1. Purpose
    
2. Read-only scope
    
3. Architecture
    
4. Why Vercel Hobby was selected
    
5. Hobby non-commercial limitation
    
6. Vercel serverless constraints
    
7. Tool catalog
    
8. Data sources
    
9. Venue attribution
    
10. Installation
    
11. Local development
    
12. Environment variables
    
13. Testing
    
14. MCP Inspector
    
15. Vercel preview deployment
    
16. Vercel production deployment
    
17. ChatGPT installation
    
18. Authentication modes
    
19. Freshness
    
20. Partial-data semantics
    
21. Output-size limits
    
22. Security
    
23. Usage-limit considerations
    
24. Troubleshooting
    

Also create:

```text
docs/requirements.md
docs/architecture.md
docs/tool-catalog.md
docs/data-contract.md
docs/vercel-deployment.md
docs/chatgpt-installation.md
docs/operations.md
docs/security.md
TASKS.md
```

# Codex implementation sequence

## Phase 1 — Research and specification

Read current official documentation for:

- Vercel MCP deployment
    
- `mcp-handler`
    
- MCP Streamable HTTP
    
- ChatGPT custom MCP apps
    
- Vercel Hobby limitations
    

Create requirements, design, tool catalog, data contract, security plan, and ordered tasks.

## Phase 2 — Initialize Next.js project

Create the standalone Next.js TypeScript project.

Enable strict TypeScript.

Install exact stable dependencies.

Create the lockfile.

## Phase 3 — Schemas and fixtures

Implement:

- Legacy schema
    
- Enriched schema
    
- Normalized schema
    
- Input schemas
    
- Output schemas
    
- Test fixtures
    

## Phase 4 — Upstream client

Implement:

- URL construction
    
- Timeout
    
- Deadline
    
- Retry
    
- Deduplication
    
- Ephemeral cache
    
- Stale fallback
    
- Safe errors
    

## Phase 5 — Normalization

Implement and test:

- Timeframes
    
- Perpetual
    
- Liquidations
    
- Options
    
- Quality
    
- Report context
    

## Phase 6 — MCP route and tools

Implement:

```text
app/api/mcp/route.ts
```

Register all seven tools.

Run MCP protocol tests.

## Phase 7 — Vercel routes and security

Implement:

- Root page
    
- Health route
    
- Readiness route
    
- Auth
    
- Headers
    
- Logging
    
- Host validation
    
- Output limits
    
- Request limits
    

## Phase 8 — Local verification

Run all tests and MCP Inspector locally.

## Phase 9 — Vercel preview deployment

Create or link the Vercel Hobby project.

Configure preview environment.

Deploy and smoke test.

## Phase 10 — Vercel production deployment

Configure production environment.

Deploy to production.

Capture the stable URL.

Run production smoke tests and MCP Inspector.

## Phase 11 — ChatGPT handoff

Prepare the exact ChatGPT installation values.

Perform manual ChatGPT installation when access is available.

Otherwise provide the unchecked manual checklist.

## Phase 12 — Final verification

Run:

```bash
npm ci
npm run check
npm run smoke:local
npm run smoke:production
```

Review:

- Final Git diff
    
- Production deployment
    
- Vercel logs
    
- Tool list
    
- Tool schemas
    
- Output limits
    
- Secrets
    
- Documentation
    

# Definition of done

The project is complete only when:

- The standalone repository exists.
    
- `npm ci` succeeds.
    
- Formatting succeeds.
    
- Linting succeeds.
    
- Type checking succeeds.
    
- Tests succeed.
    
- Next.js production build succeeds.
    
- Local MCP initialization succeeds.
    
- Local MCP Inspector succeeds.
    
- Vercel preview deployment succeeds.
    
- Vercel production deployment succeeds.
    
- Production health returns HTTP 200.
    
- Production readiness returns HTTP 200.
    
- Production MCP initialization succeeds.
    
- Production MCP Inspector lists all seven tools.
    
- Every production tool can be called.
    
- The production endpoint is stable HTTPS.
    
- The production endpoint is reachable without Vercel login.
    
- No persistent server is required.
    
- No WebSocket is created.
    
- No database is introduced.
    
- Missing data is `null`.
    
- Stale data is labelled.
    
- Venue attribution is preserved.
    
- Output is bounded.
    
- No write tool exists.
    
- No secret is committed.
    
- Vercel logs contain no secret leakage.
    
- ChatGPT installation documentation contains the actual URL.
    
- ChatGPT can scan the tools, when manual UI access is available.
    
- ChatGPT test prompts produce correctly sourced responses.
    
- Any unperformed ChatGPT UI step is explicitly marked as manual and incomplete.
    

# Final report

At completion, provide:

1. Architecture summary
    
2. Selected stable package versions
    
3. Files created
    
4. Tools implemented
    
5. Normalized data contract
    
6. Vercel project name
    
7. Vercel account scope
    
8. Preview deployment URL
    
9. Production deployment URL
    
10. Production MCP endpoint
    
11. Health endpoint
    
12. Readiness endpoint
    
13. Environment variables configured
    
14. Local test results
    
15. Production smoke-test results
    
16. MCP Inspector results
    
17. ChatGPT app installation status
    
18. ChatGPT tool-scan status
    
19. ChatGPT validation-prompt results
    
20. Hobby Plan limitations
    
21. Upstream-data limitations
    
22. Remaining risks
    
23. Confirmation that no trading or write capability exists
    

Be exact and honest.

Do not claim the MCP is deployed if production deployment failed.

Do not claim the ChatGPT app is installed if the manual ChatGPT steps were not completed.

Do not stop after scaffolding.

Do not stop after local tests.

The required deliverable is a tested Vercel production deployment plus a ChatGPT-ready remote MCP endpoint.


# Mandatory production observability, incident alerts, and root-cause diagnostics

Production observability is part of the deliverable.

The MCP is not complete merely because it returns successful responses. It must produce sufficient telemetry to:

- Detect production failures quickly.
    
- Receive notifications through email and Telegram.
    
- Correlate a notification with the exact Vercel invocation.
    
- Identify the affected MCP tool and processing stage.
    
- View the original exception and source-mapped stack trace.
    
- Distinguish application errors from upstream-data failures.
    
- Determine the deployed version and Git commit.
    
- Reproduce or diagnose the issue without exposing secrets.
    
- Detect complete outages even when the Vercel Function cannot execute.
    
- Confirm when a previously failing service has recovered.
    

Use this observability architecture:

```text
ChatGPT MCP request
        |
        v
Vercel Function
        |
        +--> Structured JSON Runtime Logs
        |
        +--> Sentry exception and trace event
        |        |
        |        +--> Email issue alert
        |        |
        |        +--> Signed webhook
        |                  |
        |                  v
        |           Telegram alert relay
        |
        +--> MCP response with safe error ID

External uptime monitor
        |
        +--> Poll /api/readyz
        |
        +--> Email and Telegram outage/recovery alerts
```

## Vercel Hobby observability constraints

Design around these constraints:

- Vercel Hobby Runtime Logs have limited retention.
    
- Vercel Log Drains are not available on Hobby.
    
- Vercel advanced anomaly alerts must not be assumed to exist on Hobby.
    
- A Vercel Function cannot report an outage if it cannot execute.
    
- In-memory notification throttling is not globally reliable across Vercel instances.
    
- Fire-and-forget promises are not reliable unless attached to the function lifecycle.
    
- Post-response work is still bounded by the Vercel Function timeout.
    
- Local files and process memory are not durable incident stores.
    

Therefore:

- Vercel Runtime Logs are the immediate operational log.
    
- Sentry is the durable exception and root-cause system.
    
- Email alerts are primarily generated by Sentry issue-alert rules.
    
- Telegram alerts are generated from validated Sentry alert webhooks.
    
- An external uptime monitor detects total deployment and readiness failures.
    
- Notification correctness must not depend solely on `after()` or module memory.
    

## Required observability services

Implement support for:

```text
Vercel Runtime Logs
Sentry
Telegram Bot API
External uptime monitoring
```

Also support optional direct email delivery through Resend for test notifications and operational fallback.

The system must remain functional when optional direct email is disabled.

### Primary responsibilities

|Component|Responsibility|
|---|---|
|Vercel Runtime Logs|Immediate request-level debugging|
|Sentry|Durable errors, stack traces, grouping, breadcrumbs, release tracking|
|Sentry email alerts|New issue, regression, and error-spike notification|
|Telegram relay|Immediate mobile notification for selected Sentry alerts|
|External uptime monitor|Detect total outage and recovery|
|Resend|Optional direct operational/test email|

Do not attempt to replace Sentry with a large custom logging database.

# Required source structure

Add or adapt these files:

```text
src/
  observability/
    logger.ts
    log-schema.ts
    sentry.ts
    error-context.ts
    error-fingerprint.ts
    breadcrumbs.ts
    release.ts

  notifications/
    types.ts
    dispatcher.ts
    telegram.ts
    resend-email.ts
    dedupe.ts
    formatter.ts
    severity.ts

  incidents/
    incident.ts
    incident-context.ts
    runbook-map.ts

app/
  api/
    notifications/
      sentry/
        route.ts

    ops/
      test-notification/
        route.ts

      notification-health/
        route.ts

instrumentation.ts
sentry.server.config.ts
```

Use the current official Sentry/Next.js file structure when it differs from the names above.

Do not preserve obsolete setup patterns merely to match this suggested layout.

Add:

```text
docs/
  observability.md
  incident-response.md
  alert-configuration.md
  external-monitoring.md

  runbooks/
    upstream-timeout.md
    upstream-http-error.md
    upstream-schema-error.md
    mcp-protocol-error.md
    vercel-timeout.md
    readiness-failure.md
    notification-delivery.md
    authentication-error.md
    output-limit-error.md
```

# Environment variables

Support:

```text
SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
SENTRY_ENVIRONMENT
SENTRY_TRACES_SAMPLE_RATE
SENTRY_ENABLED

TELEGRAM_ALERTS_ENABLED
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
TELEGRAM_MESSAGE_THREAD_ID

RESEND_ALERTS_ENABLED
RESEND_API_KEY
ALERT_EMAIL_FROM
ALERT_EMAIL_TO

ALERT_WEBHOOK_SECRET
OPS_API_TOKEN

UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

ALERT_MIN_SEVERITY
ALERT_DEDUPE_WINDOW_SECONDS
ALERT_REPEAT_THRESHOLD
ALERT_REPEAT_WINDOW_SECONDS
ALERT_NOTIFICATION_TIMEOUT_MS
```

Recommended defaults:

```text
SENTRY_ENABLED=true
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.05

TELEGRAM_ALERTS_ENABLED=true
RESEND_ALERTS_ENABLED=false

ALERT_MIN_SEVERITY=error
ALERT_DEDUPE_WINDOW_SECONDS=900
ALERT_REPEAT_THRESHOLD=3
ALERT_REPEAT_WINDOW_SECONDS=300
ALERT_NOTIFICATION_TIMEOUT_MS=3000
```

Rules:

- Never expose these values to MCP tools.
    
- Never include them in health responses.
    
- Never log them.
    
- Never commit them.
    
- Validate required values during readiness checks.
    
- Production readiness must fail when a channel is marked enabled but its required configuration is missing.
    
- Preview and development notifications must be disabled by default.
    
- Production and preview Sentry environments must remain separate.
    

## Redis exception to the previous architecture rule

Redis remains prohibited for:

- Market-data caching
    
- MCP session state
    
- Tool-result persistence
    
- User state
    

Redis is permitted only for:

- Notification webhook replay protection
    
- Telegram deduplication
    
- Incident escalation state
    
- Recovery-state tracking
    

Use a small Upstash Redis REST integration compatible with Vercel Functions.

The MCP's market-data behavior must remain correct when the notification Redis service is unavailable.

# Structured production logging

Write one valid JSON object per log line.

Do not use multiline logs.

Do not log arbitrary objects using implicit serialization.

Implement these levels:

```text
debug
info
warn
error
fatal
```

Production defaults to:

```text
info
```

## Required log fields

Every application log must use this base schema:

```json
{
  "timestamp": "ISO-8601 UTC",
  "level": "info",
  "event": "tool.call.completed",
  "service": "btc-intraday-market-data",
  "serviceVersion": "1.0.0",
  "environment": "production",
  "requestId": "",
  "traceId": "",
  "deploymentId": "",
  "release": "",
  "commitSha": "",
  "region": "",
  "route": "/api/mcp",
  "method": "POST",
  "toolName": null,
  "durationMs": 0,
  "resultStatus": "success"
}
```

Populate documented Vercel system metadata when available.

Do not fail a request merely because optional Vercel metadata is unavailable.

## Required event names

Log at least these events:

```text
request.started
request.completed
request.rejected

mcp.initialized
mcp.protocol_error

tool.call.started
tool.call.completed
tool.call.failed

upstream.request.started
upstream.request.completed
upstream.request.retry
upstream.request.failed
upstream.schema_invalid

cache.hit
cache.miss
cache.stale
cache.write

readiness.failed
readiness.recovered

notification.received
notification.deduplicated
notification.sent
notification.failed

incident.created
incident.repeated
incident.recovered

unhandled_exception
```

## Error log fields

Error and fatal logs must also include:

```json
{
  "incidentId": "",
  "errorId": "",
  "fingerprint": "",
  "errorCode": "",
  "errorClass": "",
  "safeMessage": "",
  "stage": "",
  "retryable": false,
  "httpStatus": 500,
  "upstreamHost": null,
  "upstreamStatus": null,
  "upstreamAttempt": null,
  "upstreamDurationMs": null,
  "cacheStatus": null,
  "schemaVersion": null,
  "dataAgeMs": null,
  "deadlineRemainingMs": null,
  "stackHash": "",
  "sentryEventId": null
}
```

The full stack trace must be sent to Sentry.

Do not print the complete stack trace repeatedly to Vercel logs when a concise stack hash and Sentry event ID are available.

## Log-volume limits

Keep logging intentionally compact.

Per normal successful request, target no more than:

```text
5 structured log lines
```

A typical successful request should contain:

1. Request started.
    
2. Tool call started.
    
3. Upstream completed.
    
4. Tool call completed.
    
5. Request completed.
    

Do not log each option strike.

Do not log the complete upstream response.

Do not log complete MCP tool output.

Do not log full request input unless it has been explicitly reduced to a safe summary.

# Correlation identifiers

Every incoming request must receive:

```text
requestId
traceId
```

Every error must receive:

```text
errorId
incidentId
fingerprint
```

Rules:

- Return the safe `errorId` in MCP error responses.
    
- Include `requestId` in every relevant log.
    
- Attach `requestId`, `traceId`, and `errorId` to Sentry.
    
- Include the identifiers in Telegram and email alerts.
    
- Ensure a user can search Vercel Runtime Logs using `requestId`.
    
- Ensure a user can search Sentry using `errorId` or `fingerprint`.
    

Do not derive an identifier from secret data.

# Error fingerprinting

Generate a deterministic fingerprint using safe fields:

```text
service
environment
errorCode
errorClass
route
toolName
processingStage
upstreamHost
normalized top stack frame
```

Do not include:

- Request ID
    
- Timestamp
    
- Market price
    
- Complete error message containing dynamic data
    
- User input
    
- Authorization data
    
- Secret values
    

The same underlying failure should normally produce the same fingerprint.

Different root causes must not be collapsed merely because both returned HTTP 500.

Test fingerprint stability.

# Root-cause incident context

Every Sentry event must include a sanitized root-cause context:

```json
{
  "incident": {
    "incidentId": "",
    "errorId": "",
    "fingerprint": "",
    "severity": "error",
    "occurredAt": ""
  },
  "deployment": {
    "environment": "production",
    "release": "",
    "commitSha": "",
    "deploymentId": "",
    "region": ""
  },
  "request": {
    "requestId": "",
    "traceId": "",
    "route": "",
    "method": "",
    "toolName": ""
  },
  "processing": {
    "stage": "",
    "durationMs": 0,
    "deadlineRemainingMs": 0,
    "cacheStatus": "",
    "schemaVersion": ""
  },
  "upstream": {
    "host": "",
    "status": null,
    "attempt": 1,
    "durationMs": null,
    "responseContentType": null,
    "responseBodyHash": null
  },
  "marketData": {
    "sourceTimestamp": null,
    "dataAgeMs": null,
    "qualityStatus": null
  }
}
```

Never attach:

- Full upstream response bodies
    
- Full options chains
    
- Authorization headers
    
- Bot tokens
    
- Email API keys
    
- Sentry tokens
    
- Cookies
    
- User IP addresses by default
    
- ChatGPT conversation contents
    
- Raw MCP request bodies
    
- Environment dumps
    

# Sentry integration

Sentry is mandatory for the production deployment.

Use the current stable official Sentry SDK for Next.js.

Implement:

- Server-side exception capture.
    
- Unhandled exception capture.
    
- Rejected promise capture.
    
- Source-map upload.
    
- Release identification.
    
- Environment identification.
    
- Request and tool tags.
    
- Error fingerprinting.
    
- Breadcrumbs.
    
- Sanitization through `beforeSend`.
    
- Low-rate performance tracing.
    
- Safe flushing within the Vercel lifecycle.
    

## Source maps

Production Sentry issues must show source-mapped TypeScript stack traces.

Configure:

```text
release = Git commit SHA
environment = Vercel environment
```

Source maps must:

- Be uploaded during the production build.
    
- Match the deployed release.
    
- Not expose credentials.
    
- Not be unintentionally served publicly when private upload is supported.
    
- Be verified using an intentional test exception.
    

## Required Sentry tags

Attach:

```text
service
service.version
environment
release
route
tool.name
error.code
error.class
processing.stage
upstream.host
upstream.status
cache.status
schema.version
quality.status
vercel.region
```

Use tags only for bounded-cardinality values.

Do not put request IDs, timestamps, prices, or full URLs into high-cardinality tags.

Use Sentry contexts or extras for identifiers.

## Breadcrumbs

Record bounded breadcrumbs for:

```text
MCP request accepted
Tool selected
Upstream fetch started
Upstream retry attempted
Upstream response received
Schema selected
Normalization completed
Cache used
Output truncated
Tool response completed
```

Do not record full payloads.

Limit breadcrumb count and field size.

## Sentry sampling

Capture:

```text
100% of exceptions
```

Use a low initial trace sample rate suitable for Vercel Hobby:

```text
0.05
```

Make tracing configurable.

Do not enable expensive session replay because this project has no material browser UI.

# Severity model

Use:

```text
debug
info
warning
error
critical
```

Map incidents as follows.

## No notification

Do not notify for:

- Invalid user/tool input.
    
- Unknown MCP tool.
    
- Authentication rejection.
    
- Normal rate-limit rejection.
    
- Expected partial market data.
    
- A single successfully recovered retry.
    
- Optional data unavailable with an honest partial response.
    

Log these at an appropriate level.

## Warning

Examples:

- Stale cache was used successfully.
    
- One optional upstream section is unavailable.
    
- Notification provider is temporarily slow.
    
- Output had to be reduced.
    
- Upstream retry succeeded.
    

Warnings are logged and may be sent to Sentry as messages when useful.

Do not send immediate Telegram notifications for individual warnings.

## Error

Examples:

- Tool call failed completely.
    
- Upstream schema cannot be parsed.
    
- No live or cached data is available.
    
- Sentry-capturable internal invariant failed.
    
- Readiness remains unavailable.
    
- Notification webhook processing failed.
    
- Repeated upstream timeouts crossed the configured threshold.
    

Errors create Sentry issues and trigger email according to alert rules.

Telegram is sent when the configured repetition or impact threshold is crossed.

## Critical

Examples:

- All MCP tools are failing.
    
- Production readiness is continuously failing.
    
- A deployment introduced immediate widespread 5xx responses.
    
- Configuration prevents the service from starting.
    
- Sentry webhook signature verification is being repeatedly attacked.
    
- Market-data output could be materially corrupted.
    
- Secrets may have been exposed.
    
- A production function repeatedly times out.
    

Critical incidents trigger immediate:

```text
Sentry event
Email alert
Telegram alert
```

# Sentry email alerts

Configure Sentry issue-alert rules for production.

At minimum, notify the configured owner email for:

1. A new production issue.
    
2. A previously resolved issue regresses.
    
3. The same issue occurs at least three times within five minutes.
    
4. A critical-tagged incident occurs once.
    
5. A production error spike is detected when supported.
    
6. A readiness-related issue remains active for five minutes.
    

Email notifications must contain or link to:

- Issue title
    
- Severity
    
- First-seen timestamp
    
- Last-seen timestamp
    
- Event count
    
- Environment
    
- Release
    
- Commit SHA
    
- Affected route
    
- Affected MCP tool
    
- Error code
    
- Sentry issue URL
    
- Request ID
    
- Relevant runbook
    

Do not include secrets or full market payloads.

Document the Sentry dashboard configuration in:

```text
docs/alert-configuration.md
```

Codex must not claim the email rule is configured unless it was actually configured in Sentry.

# Telegram incident alerts

Telegram alerts are mandatory for production unless explicitly disabled by the operator.

Send alerts through a Telegram bot to the configured private chat, group, or topic.

Support:

```text
TELEGRAM_CHAT_ID
TELEGRAM_MESSAGE_THREAD_ID
```

Use plain text or safely escaped HTML.

Keep each Telegram message compact.

Do not send complete stack traces to Telegram.

## Telegram notification content

Format critical and escalated error messages approximately as:

```text
🔴 BTC Intraday MCP — CRITICAL

Incident: INC-...
Error: UPSTREAM_SCHEMA_ERROR
Service: btc-intraday-market-data
Environment: production
Tool: get_btc_intraday_snapshot
Stage: upstream-validation
Time: 2026-07-22T08:00:00Z

Request ID: ...
Release: ...
Commit: ...
Region: ...
Upstream: alchemy666888.vercel.app
HTTP status: 200
Data schema: invalid
Occurrences: 4 in 5 minutes

Sentry: <issue URL>
Vercel logs: <safe dashboard or search hint>
Runbook: docs/runbooks/upstream-schema-error.md
```

Recovery format:

```text
🟢 BTC Intraday MCP — RECOVERED

Incident: INC-...
Service recovered at: ...
Outage duration: ...
Current readiness: ready
Last successful upstream fetch: ...
```

## Telegram delivery behavior

- Use a three-second timeout.
    
- Retry once only for a safe transient delivery failure.
    
- Respect Telegram rate-limit responses.
    
- Never allow notification failure to replace the original application error.
    
- Capture notification failure in Sentry.
    
- Prevent recursive notifications about notification failures.
    
- Do not repeatedly alert on the same incident.
    
- Send a recovery notification when the incident has actually recovered.
    

The Telegram Bot API requires the bot token in the provider endpoint path. Construct this endpoint only server-side and ensure the complete URL is always redacted from logs, traces, breadcrumbs, and exceptions.

# Sentry-to-Telegram alert relay

Implement:

```text
POST /api/notifications/sentry
```

This route receives selected Sentry alert events and relays them to Telegram.

Requirements:

- Node.js runtime.
    
- Dynamic route.
    
- JSON-only content type.
    
- Maximum body size of 128 KB.
    
- Verify the webhook using the current official Sentry signing mechanism.
    
- Reject missing or invalid signatures.
    
- Enforce timestamp tolerance when supported.
    
- Protect against replay.
    
- Strictly validate the webhook schema.
    
- Allow only documented Sentry alert event types.
    
- Extract only required safe fields.
    
- Use the Sentry event or alert ID as the delivery idempotency key.
    
- Store processed webhook IDs in Redis with a TTL.
    
- Return a generic response.
    
- Never expose Telegram provider responses.
    
- Never include the Telegram bot token in logs.
    
- Never accept an arbitrary destination chat ID from the webhook payload.
    
- Use only the configured chat ID.
    

Do not relay every raw Sentry event.

Relay only events selected by configured Sentry alert rules.

# Notification deduplication and suppression

Use Upstash Redis only for notification state.

Required keys should follow a namespaced pattern such as:

```text
btc-mcp:notification:event:<eventId>
btc-mcp:incident:<fingerprint>:state
btc-mcp:incident:<fingerprint>:count:<timeBucket>
```

Requirements:

- Atomic set-if-not-exists for event delivery.
    
- TTL on every key.
    
- No unbounded key growth.
    
- Do not store complete exception bodies.
    
- Do not store stack traces.
    
- Do not store secrets.
    
- Do not store market payloads.
    

Default behavior:

```text
Deduplication window: 15 minutes
Escalation threshold: 3 occurrences in 5 minutes
Recovery confirmation: 2 successful checks
```

A new critical incident may bypass the normal repetition threshold.

If Redis is unavailable:

- Continue capturing the error in Sentry.
    
- Continue returning the correct MCP response.
    
- Log notification deduplication as degraded.
    
- Prefer suppressing Telegram to risking an alert storm.
    
- Email through Sentry remains available.
    

# Optional Resend email channel

Support Resend as an optional direct-email channel.

Use it only for:

- Protected notification test requests.
    
- Production smoke-test failure.
    
- Sentry-to-Telegram relay failure.
    
- Critical notification-pipeline degradation.
    
- Explicit operator-enabled direct incident alerts.
    

Do not duplicate every Sentry email by default.

Use a deterministic idempotency key based on:

```text
environment
incident fingerprint
alert type
time bucket
```

The email must contain the same correlation identifiers as Telegram.

Use text and minimal HTML.

Do not attach logs or payloads.

# Protected operational routes

Implement:

```text
POST /api/ops/test-notification
GET /api/ops/notification-health
```

These routes must require:

```text
Authorization: Bearer <OPS_API_TOKEN>
```

Use timing-safe comparison.

They must not be accessible through MCP tools.

## Test-notification route

Support:

```json
{
  "channels": ["sentry", "telegram", "email"],
  "severity": "warning",
  "message": "Production notification verification"
}
```

Input must be strictly validated.

The route must:

- Generate a synthetic incident ID.
    
- Mark the event as a test.
    
- Send only to selected configured channels.
    
- Return per-channel delivery status.
    
- Never return provider credentials.
    
- Never return raw provider responses.
    
- Be disabled when `OPS_API_TOKEN` is absent.
    

## Notification-health route

Return safe status such as:

```json
{
  "status": "ok",
  "sentryConfigured": true,
  "telegramConfigured": true,
  "emailConfigured": false,
  "dedupeStoreConfigured": true,
  "lastSuccessfulTelegramDeliveryAt": null,
  "lastSuccessfulEmailDeliveryAt": null
}
```

Do not test providers on every health request.

Do not expose recipient addresses, chat IDs, tokens, DSNs, or Redis URLs.

# External outage monitoring

Configure at least one external synthetic uptime monitor.

The monitor must run outside this Vercel project because the application cannot notify when it is completely unavailable.

Monitor:

```text
GET https://<production-domain>/api/readyz
```

Recommended behavior:

```text
Check interval: 5 minutes or less
Request timeout: 10 seconds
Failure threshold: 2 consecutive failures
Recovery threshold: 2 consecutive successes
Expected HTTP status: 200
```

The monitor must notify:

```text
Email
Telegram
```

It must alert on:

- DNS failure
    
- TLS failure
    
- Connection timeout
    
- HTTP 5xx
    
- HTTP 404
    
- Invalid readiness response
    
- Sustained excessive latency
    

It must send a recovery notification.

Use a reputable external monitoring service that supports HTTPS checks and the required channels.

Do not implement the outage monitor as:

- A Vercel Cron job in the same project.
    
- A timer inside the MCP Function.
    
- A background Node process.
    
- A ChatGPT automation.
    
- An in-memory loop.
    

Document setup in:

```text
docs/external-monitoring.md
```

Codex must not mark this complete unless the external check was actually created and verified.

# Readiness incident behavior

`/api/readyz` must return machine-readable failure categories:

```json
{
  "status": "not_ready",
  "checks": {
    "configuration": "ok",
    "mcpRegistration": "ok",
    "upstream": "failed",
    "schema": "unknown",
    "notifications": "degraded"
  },
  "errorId": "ERR-...",
  "timestamp": ""
}
```

Do not include:

- Stack traces
    
- Tokens
    
- Provider URLs containing credentials
    
- Raw upstream payloads
    
- Internal environment values
    

Readiness notification rules:

- One isolated readiness failure is logged.
    
- Two consecutive external-monitor failures trigger an outage alert.
    
- Recovery requires two consecutive successful external checks.
    
- Avoid sending readiness alerts directly from every `/api/readyz` call.
    

# Incident runbooks

Map each important error code to a runbook.

Example mapping:

```text
UPSTREAM_TIMEOUT_ERROR
  -> docs/runbooks/upstream-timeout.md

UPSTREAM_SCHEMA_ERROR
  -> docs/runbooks/upstream-schema-error.md

MCP_PROTOCOL_ERROR
  -> docs/runbooks/mcp-protocol-error.md

DEADLINE_EXCEEDED_ERROR
  -> docs/runbooks/vercel-timeout.md

READINESS_ERROR
  -> docs/runbooks/readiness-failure.md

NOTIFICATION_DELIVERY_ERROR
  -> docs/runbooks/notification-delivery.md
```

Every runbook must contain:

1. Meaning of the error.
    
2. User-visible effect.
    
3. Most likely causes.
    
4. How to locate the Sentry issue.
    
5. How to search Vercel Runtime Logs.
    
6. Fields to inspect.
    
7. Verification commands.
    
8. Safe remediation steps.
    
9. Rollback criteria.
    
10. Recovery verification.
    
11. When to escalate.
    
12. How to prevent recurrence.
    

# Root-cause investigation workflow

Document this exact workflow:

## 1. Start from notification

Copy:

```text
incidentId
errorId
requestId
fingerprint
release
commitSha
```

## 2. Open Sentry

Inspect:

```text
source-mapped stack trace
exception cause chain
breadcrumbs
tags
first seen
last seen
event count
affected release
```

## 3. Search Vercel logs

Search by:

```text
requestId
errorId
fingerprint
```

Document current CLI examples, including:

```bash
vercel logs --level error --since 1h
vercel logs --follow
```

Use the current supported CLI syntax at implementation time.

## 4. Identify failure class

Classify the incident as:

```text
MCP protocol
tool input
upstream network
upstream HTTP
upstream schema
normalization
output serialization
Vercel deadline
configuration
notification delivery
```

## 5. Compare deployment

Check whether the issue began after:

```text
release
commit SHA
production deployment
environment-variable change
dependency upgrade
upstream schema change
```

## 6. Reproduce safely

Use fixtures or a captured sanitized schema shape.

Do not use secrets or complete production payloads in tests.

## 7. Fix and verify

Require:

```text
unit test reproducing the issue
fix
full npm run check
preview deployment
preview smoke test
production deployment
production smoke test
Sentry issue resolution
recovery verification
```

# Notification recursion prevention

Notification infrastructure must never produce an infinite alert loop.

Rules:

- A Telegram failure may be captured in Sentry once.
    
- A Telegram failure must not trigger another Telegram notification.
    
- A Resend failure must not trigger another Resend notification.
    
- A Sentry webhook failure must not trigger the same Sentry alert webhook recursively.
    
- Notification-related incidents must use a separate fingerprint namespace.
    
- Use a recursion-depth or notification-context flag.
    
- Test recursive-failure suppression.
    

# Required tests

Add tests for:

## Logging

- Base log schema.
    
- Required fields.
    
- Request correlation.
    
- Error correlation.
    
- One-line JSON output.
    
- Secret redaction.
    
- Authorization redaction.
    
- Telegram URL redaction.
    
- Sentry DSN redaction.
    
- Email-address redaction where configured.
    
- Large-field truncation.
    
- Bounded successful-request logging.
    

## Fingerprinting

- Stable fingerprint for the same root cause.
    
- Different fingerprint for different processing stages.
    
- Dynamic timestamps do not change the fingerprint.
    
- Dynamic request IDs do not change the fingerprint.
    
- Secrets never enter the fingerprint.
    

## Sentry

- Exception capture.
    
- Tag attachment.
    
- Context attachment.
    
- Breadcrumb limits.
    
- `beforeSend` redaction.
    
- Disabled-Sentry behavior.
    
- Source-map configuration verification.
    
- Release and environment mapping.
    

## Telegram

- Successful `sendMessage`.
    
- Provider timeout.
    
- HTTP 429.
    
- HTTP 400.
    
- Malformed provider response.
    
- Message escaping.
    
- Maximum message length.
    
- Token URL redaction.
    
- Retry limit.
    
- Recovery message.
    
- Recursive failure suppression.
    

## Sentry webhook relay

- Valid signature.
    
- Invalid signature.
    
- Missing signature.
    
- Expired timestamp.
    
- Replayed event.
    
- Unsupported event.
    
- Oversized body.
    
- Malformed JSON.
    
- Valid event delivery.
    
- Duplicate event suppression.
    
- Configured chat ID cannot be overridden.
    

## Redis deduplication

- First delivery accepted.
    
- Duplicate delivery rejected.
    
- TTL applied.
    
- Atomic behavior.
    
- Redis unavailable.
    
- No payload or secret persistence.
    

## Email

- Resend disabled.
    
- Successful test email.
    
- Provider failure.
    
- Idempotency key.
    
- Recipient never returned by operational endpoints.
    
- Recursive failure suppression.
    

## Operational routes

- Missing ops token.
    
- Invalid ops token.
    
- Valid test request.
    
- Input validation.
    
- Safe notification-health output.
    
- No secrets in responses.
    

## Incident behavior

- New warning.
    
- New error.
    
- New critical incident.
    
- Repeat threshold.
    
- Deduplication window.
    
- Recovery transition.
    
- No alert for expected user errors.
    
- No alert for normal partial data.
    
- Alert for repeated total upstream failure.
    
- Alert for schema incompatibility.
    

# Production verification

After deployment, perform these checks.

## Vercel logs

Generate:

```text
one successful MCP request
one invalid tool-input request
one controlled upstream fixture failure in preview
```

Verify logs can be searched by:

```text
requestId
toolName
errorCode
```

Verify no secrets or full payloads appear.

## Sentry test exception

Trigger one protected synthetic exception in preview.

Verify:

- Sentry issue created.
    
- Environment is preview.
    
- Release matches commit SHA.
    
- Stack trace is source mapped.
    
- Request ID is present.
    
- Tool or route tag is present.
    
- No secret is present.
    

Repeat in production only through the protected test mechanism.

## Email test

Verify receipt of a test Sentry email alert.

If Resend is enabled, separately verify one direct test email.

## Telegram test

Verify receipt of a test Telegram alert.

Confirm it contains:

```text
incident ID
environment
release
request ID
safe error summary
Sentry link or test-event reference
```

Confirm it does not contain:

```text
bot token
stack trace
market payload
authorization data
environment variables
```

## External monitor

Temporarily point a preview monitor at a controlled failing readiness endpoint or use the monitor's test-notification feature.

Verify:

```text
failure alert received
recovery alert received
email received
Telegram received
```

Do not intentionally break the production endpoint merely to test monitoring.

# Additional MUST-HAVEs

The following are now mandatory:

- Structured Vercel Runtime Logs.
    
- Stable request and error correlation IDs.
    
- Deterministic incident fingerprints.
    
- Sentry production error tracking.
    
- Source-mapped stack traces.
    
- Sentry release and commit tracking.
    
- Sentry email issue alerts.
    
- Signed Sentry webhook receiver.
    
- Telegram critical-incident alerts.
    
- Telegram recovery alerts.
    
- Notification deduplication.
    
- Notification replay protection.
    
- Notification recursion protection.
    
- Optional Resend support.
    
- Protected test-notification endpoint.
    
- Protected notification-health endpoint.
    
- External readiness monitor.
    
- External outage email notification.
    
- External outage Telegram notification.
    
- Incident runbooks.
    
- Root-cause investigation documentation.
    
- Production verification checklist.
    
- No secret leakage in logs or notifications.
    

# Additional NOT-TO-DO

The implementation must not:

- Depend only on one-hour Vercel Runtime Logs.
    
- Claim Vercel Log Drains are available on Hobby.
    
- Claim Vercel advanced anomaly Alerts are available on Hobby.
    
- Build a custom long-term log database.
    
- Store full exceptions in Redis.
    
- Store market payloads in Redis.
    
- Send one notification for every failed invocation.
    
- Send Telegram synchronously on the MCP critical response path.
    
- Allow notification delivery to change a valid MCP result.
    
- Send complete stack traces through Telegram.
    
- Send full upstream payloads through email.
    
- Include secrets in Sentry contexts.
    
- Include high-cardinality values as Sentry tags.
    
- expose operational notification routes without authentication.
    
- Trust unsigned Sentry webhook requests.
    
- Accept Telegram destination IDs from webhook payloads.
    
- Rely on in-memory deduplication for production correctness.
    
- Create notification recursion loops.
    
- Use the production service itself as its only uptime monitor.
    
- Claim alerts are configured without verifying them.
    
- Claim email or Telegram delivery works without a successful test.
    
- Mark external monitoring complete when only documentation exists.
    

# Updated definition of done

The production observability work is complete only when:

- Structured production logs are visible in Vercel.
    
- A successful request can be traced by request ID.
    
- A failed request can be traced by error ID.
    
- A Sentry issue contains a source-mapped stack trace.
    
- Sentry shows the correct release and environment.
    
- Sentry email notification has been received.
    
- Telegram incident notification has been received.
    
- Telegram recovery notification has been tested.
    
- Duplicate Sentry webhook delivery does not duplicate Telegram messages.
    
- Notification-provider failures do not cause recursive alerts.
    
- The protected test-notification route works.
    
- The notification-health route exposes no sensitive information.
    
- The external uptime monitor is active.
    
- External outage email notification has been verified.
    
- External outage Telegram notification has been verified.
    
- Every major error code has a runbook.
    
- Vercel logs, Sentry events, and notifications share correlation identifiers.
    
- No secret appears in logs, Sentry, email, or Telegram.
    
- Remaining manual setup steps are explicitly listed as incomplete.
    

# Updated final report

The final Codex report must additionally include:

1. Vercel logging implementation.
    
2. Log-event schema.
    
3. Sentry project and environment status.
    
4. Source-map verification result.
    
5. Sentry email-alert configuration status.
    
6. Telegram bot configuration status.
    
7. Telegram test-delivery result.
    
8. Resend status, if enabled.
    
9. Notification deduplication mechanism.
    
10. Sentry webhook signature-verification method.
    
11. External uptime-monitor provider and check URL.
    
12. Failure-alert verification.
    
13. Recovery-alert verification.
    
14. Incident runbook locations.
    
15. Example correlation workflow.
    
16. Known Hobby Plan observability limitations.
    
17. Any alerting steps that still require manual account access.
    

Be exact.

Do not claim a notification channel is operational until a real test message has been received.