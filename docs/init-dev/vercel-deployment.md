# Vercel Deployment

Project name: `btc-intraday-mcp`. Deploy with Vercel CLI and promote a production deployment. The production MCP endpoint is `https://btc-intraday-mcp.vercel.app/api/mcp` unless Vercel assigns a different stable domain.

Set variables with `vercel env add VARIABLE_NAME production`, `preview`, and `development`, or in Vercel Dashboard → Project → Settings → Environment Variables.

Required post-deploy variables:

- `MCP_PUBLIC_BASE_URL=https://<actual-production-domain>`
- `ALLOWED_HOSTS=<actual-production-domain>`

Do not protect the production endpoint with Vercel login if ChatGPT must access it. Preview deployments may remain protected.
