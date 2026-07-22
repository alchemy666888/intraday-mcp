import { z } from "zod";
export const SERVICE = "btc-intraday-market-data";
export const VERSION = "1.0.0";
const schema = z.object({
  MARKET_DATA_API_URL: z.string().url().default("https://alchemy666888.vercel.app/api/hyperliquid"),
  MARKET_DATA_PROFILE: z.string().default("btc-intraday"),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(8000).default(6000),
  UPSTREAM_MAX_RETRIES: z.coerce.number().int().min(0).max(1).default(1),
  UPSTREAM_CACHE_TTL_MS: z.coerce.number().int().min(0).max(10000).default(3000),
  UPSTREAM_STALE_IF_ERROR_MS: z.coerce.number().int().min(0).max(60000).default(30000),
  MAX_ACCEPTABLE_DATA_AGE_MS: z.coerce.number().int().min(1000).max(3600000).default(120000),
  MAX_TOOL_RESULT_BYTES: z.coerce.number().int().min(10000).max(1000000).default(500000),
  AUTH_MODE: z.enum(["none", "bearer"]).default("none"),
  MCP_BEARER_TOKEN: z.string().optional(),
  MCP_PUBLIC_BASE_URL: z.string().url().optional(),
  ALLOWED_HOSTS: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});
export type Env = z.infer<typeof schema>;
export function getEnv(): Env {
  const env = schema.parse(process.env);
  if (env.AUTH_MODE === "bearer" && !env.MCP_BEARER_TOKEN) throw new Error("MCP_BEARER_TOKEN is required");
  return env;
}
export function upstreamUrl(env = getEnv()): string {
  const url = new URL(env.MARKET_DATA_API_URL);
  url.searchParams.set("profile", env.MARKET_DATA_PROFILE);
  return url.toString();
}
