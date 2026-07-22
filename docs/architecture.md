# Architecture

Selected stable versions after inspecting current docs on 2026-07-22:

- Next.js `15.5.21` (stable release line on Vercel; canary/preview avoided)
- React `19.1.2`
- `mcp-handler` `1.1.0`
- `@modelcontextprotocol/sdk` `1.26.0` or newer security-fixed line; pinned here to `1.26.0`
- Zod `3.25.76`

The MCP route is `app/api/mcp/route.ts`, uses Next.js App Router, Vercel Node.js Functions, `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `maxDuration = 15`.

The server is stateless. Each tool invocation performs one bounded upstream fetch to `MARKET_DATA_API_URL?profile=MARKET_DATA_PROFILE`, validates shape with Zod, normalizes deterministically, and returns bounded JSON. Module cache and in-flight deduplication are best-effort only; correctness does not depend on warm instances.

Vercel documentation confirms MCP servers can be deployed to Vercel Functions. `mcp-handler` documentation shows `createMcpHandler`, Next.js route exports, `basePath: "/api"`, and Streamable HTTP support.
