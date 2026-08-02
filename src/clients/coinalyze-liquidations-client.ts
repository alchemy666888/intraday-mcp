import { z } from "zod";
import { getEnv } from "@/config/env";
import { providerJson, type ProviderFetch } from "@/clients/provider-http";
import { dedupe, getCache, setCache } from "@/cache/ephemeral-cache";
/* eslint-disable @typescript-eslint/no-explicit-any -- cache writes follow schema validation */
const catalogSchema = z.array(
  z.object({
    symbol: z.string(),
    exchange: z.string(),
    base_asset: z.string(),
    is_perpetual: z.boolean(),
  }),
);
const historySchema = z.array(
  z.object({
    symbol: z.string(),
    history: z.array(
      z.object({ t: z.number(), l: z.number().nonnegative(), s: z.number().nonnegative() }),
    ),
  }),
);
const allowlist = ["Binance", "Bybit", "OKX", "BitMEX", "Gate", "Deribit", "Hyperliquid"];
const budget: number[] = [];
export async function fetchCoinalyzeLiquidations(
  options: { fetch?: ProviderFetch; now?: () => number } = {},
) {
  const env = getEnv(),
    now = (options.now ?? Date.now)();
  if (!env.COINALYZE_API_KEY) return unavailable(now, "missing_api_key");
  const headers = { api_key: env.COINALYZE_API_KEY };
  const catalogKey = "coinalyze:catalog";
  let catalog = getCache<z.infer<typeof catalogSchema>>(catalogKey)?.entry.payload;
  if (!catalog) {
    catalog = catalogSchema.parse(
      await providerJson("https://api.coinalyze.net/v1/future-markets", {
        fetch: options.fetch,
        timeoutMs: env.DIRECT_PROVIDER_TIMEOUT_MS,
        headers,
      }),
    );
    setCache(catalog, 200, 900_000, 0, catalogKey);
  }
  const supported = catalog.filter(
    (m) => m.base_asset === "BTC" && m.is_perpetual && allowlist.includes(m.exchange),
  );
  const requested = env.COINALYZE_LIQUIDATION_SYMBOLS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let included: string[] = [];
  if (requested)
    included = [...new Set(requested)]
      .filter((s) => supported.some((m) => m.symbol === s))
      .slice(0, 8);
  else
    for (const venue of allowlist) {
      const market = supported.find((m) => m.exchange === venue);
      if (market && !included.includes(market.symbol)) included.push(market.symbol);
    }
  included = included.slice(0, 8);
  const excluded = (requested ?? []).filter((s) => !included.includes(s));
  if (!included.length)
    return {
      ...unavailable(now, "no_supported_symbols"),
      requestedSymbols: requested ?? [],
      includedSymbols: [],
      excludedSymbols: excluded,
    };
  while (budget[0] !== undefined && budget[0] <= now - 60_000) budget.shift();
  if (budget.length + included.length > 40) return unavailable(now, "local_rate_budget_exceeded");
  budget.push(...included.map(() => now));
  const key = `coinalyze:liquidations:${included.slice().sort().join(",")}`;
  const cached = getCache<any>(key);
  if (cached?.state === "fresh") return { ...cached.entry.payload, cacheStatus: "hit" };
  return dedupe(key, async () => {
    const from = Math.floor((now - 61 * 60_000) / 1000),
      to = Math.floor(now / 1000);
    const url = `https://api.coinalyze.net/v1/liquidation-history?symbols=${encodeURIComponent(included.join(","))}&interval=1min&from=${from}&to=${to}&convert_to_usd=true`;
    const raw = historySchema.parse(
      await providerJson(url, {
        fetch: options.fetch,
        timeoutMs: env.DIRECT_PROVIDER_TIMEOUT_MS,
        headers,
      }),
    );
    const unique = new Map<string, { t: number; l: number; s: number }>();
    for (const group of raw)
      for (const row of group.history)
        if (row.t * 1000 <= now) unique.set(`${group.symbol}:${row.t}`, row);
    const latest = Math.max(...[...unique.values()].map((r) => r.t));
    const windows = Object.fromEntries(
      [
        ["5m", 5],
        ["15m", 15],
        ["1h", 60],
      ].map(([name, count]) => {
        const rows = [...unique.values()].filter((r) => r.t > latest - Number(count) * 60);
        const long = rows.reduce((n, r) => n + r.l, 0),
          short = rows.reduce((n, r) => n + r.s, 0);
        return [
          name,
          {
            window: name,
            longLiquidationUsd: long,
            shortLiquidationUsd: short,
            totalLiquidationUsd: long + short,
            eventCount: null,
            largestLiquidationUsd: null,
            lastEventAt: null,
            unsupportedByProvider: true,
            eventMetadataReason: "provider_does_not_supply_event_records",
          },
        ];
      }),
    );
    const result = {
      source: "Coinalyze REST",
      venue: "selected Coinalyze-supported venues",
      marketType: "aggregate",
      method: "one-minute USD liquidation buckets",
      sourceTimestamp: new Date(latest * 1000).toISOString(),
      receivedAt: new Date(now).toISOString(),
      status: "live",
      cacheStatus: "miss",
      fallback: false,
      reason: null,
      warnings: [],
      requestedSymbols: requested ?? included,
      includedSymbols: included,
      excludedSymbols: excluded,
      includedVenues: [
        ...new Set(supported.filter((m) => included.includes(m.symbol)).map((m) => m.exchange)),
      ],
      globalCoverage: false,
      coverageStatement: "Selected-provider coverage; not complete global liquidation coverage",
      ...windows,
    };
    setCache(result, 200, 60_000, 240_000, key);
    return result;
  });
}
function unavailable(now: number, reason: string) {
  return {
    source: "Coinalyze REST",
    venue: "selected Coinalyze-supported venues",
    marketType: "aggregate",
    method: "one-minute USD liquidation buckets",
    sourceTimestamp: null,
    receivedAt: new Date(now).toISOString(),
    status: "unavailable",
    cacheStatus: "not-used",
    fallback: false,
    reason,
    warnings: [],
    globalCoverage: false,
  };
}
export function resetCoinalyzeBudgetForTests() {
  budget.length = 0;
}
