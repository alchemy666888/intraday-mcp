import { getEnv } from "@/config/env";
import { providerJson, type ProviderFetch } from "@/clients/provider-http";
import { BinanceKlinesSchema, BinancePriceSchema, BinanceStatsSchema } from "@/schemas/binance";
import { dedupe, getCache, setCache } from "@/cache/ephemeral-cache";
/* eslint-disable @typescript-eslint/no-explicit-any -- provider tuples are schema-validated */
const hosts = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
];
async function request(path: string, fetcher?: ProviderFetch) {
  let last: unknown;
  for (const host of hosts) {
    try {
      return {
        json: await providerJson(host + path, {
          fetch: fetcher,
          timeoutMs: getEnv().DIRECT_PROVIDER_TIMEOUT_MS,
        }),
        host,
      };
    } catch (e) {
      last = e;
    }
  }
  throw last;
}
export async function fetchBinanceSpot(
  earliestAnchorMs: number,
  options: { fetch?: ProviderFetch; now?: () => number } = {},
) {
  const key = `binance:spot:${earliestAnchorMs}`;
  const cached = getCache<any>(key);
  if (cached?.state === "fresh") return { ...cached.entry.payload, cacheStatus: "hit" };
  return dedupe(key, async () => {
    const now = (options.now ?? Date.now)();
    const priceP = request("/api/v3/ticker/price?symbol=BTCUSDT", options.fetch),
      statsP = request("/api/v3/ticker/24hr?symbol=BTCUSDT", options.fetch);
    const bars: any[] = [];
    let start = earliestAnchorMs,
      host: string | null = null;
    for (let page = 0; page < 2 && start <= now; page++) {
      const response = await request(
        `/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1000&startTime=${start}`,
        options.fetch,
      );
      host = response.host;
      const parsed = BinanceKlinesSchema.parse(response.json);
      bars.push(...parsed);
      if (parsed.length < 1000) break;
      start = parsed[parsed.length - 1][0] + 60_000;
    }
    const [priceR, statsR] = await Promise.all([priceP, statsP]);
    const price = BinancePriceSchema.parse(priceR.json),
      stats = BinanceStatsSchema.parse(statsR.json);
    const normalized = [
      ...new Map(
        bars.map((b) => [
          b[0],
          {
            openTime: new Date(b[0]).toISOString(),
            closeTime: new Date(b[6]).toISOString(),
            open: +b[1],
            high: +b[2],
            low: +b[3],
            close: +b[4],
            baseVolume: +b[5],
            quoteVolume: +b[7],
            tradeCount: b[8],
            isClosed: b[6] < now,
          },
        ]),
      ).values(),
    ].sort((a, b) => a.openTime.localeCompare(b.openTime));
    const result = {
      source: "Binance Spot public REST",
      venue: "Binance",
      marketType: "spot",
      method: "ticker + 24h + one-minute klines",
      endpoint: host,
      receivedAt: new Date(now).toISOString(),
      cacheStatus: "miss",
      fallback: host !== hosts[0],
      priceUsd: +price.price,
      change24hPct: +stats.priceChangePercent,
      high24hUsd: +stats.highPrice,
      low24hUsd: +stats.lowPrice,
      baseVolume24h: +stats.volume,
      quoteVolume24h: +stats.quoteVolume,
      bars: normalized,
      truncated: bars.length >= 2000,
    };
    setCache(result, 200, 15_000, 105_000, key);
    return result;
  });
}
