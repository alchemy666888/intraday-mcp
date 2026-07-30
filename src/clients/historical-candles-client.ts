import {
  BATS_TIMEFRAMES,
  type BatsTimeframe,
  type Candle,
  type CandleSeries,
} from "@/domain/market-data";
import { validateCandles } from "@/market-history/validation";

type Venue = "auto" | "binance_spot" | "binance_usdm" | "hyperliquid";
type MarketType = "spot" | "perpetual";

const binanceEndpoints = ["https://api.binance.com", "https://data-api.binance.vision"];
const timeoutMs = 4_000;

async function postJson(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url: URL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

function binanceCandle(row: unknown, now: number): Candle | null {
  if (!Array.isArray(row)) return null;
  const openTime = number(row[0]);
  const closeTime = number(row[6]);
  if (![openTime, closeTime].every(Number.isFinite)) return null;
  return {
    openTime: new Date(openTime).toISOString(),
    closeTime: new Date(closeTime).toISOString(),
    open: number(row[1]),
    high: number(row[2]),
    low: number(row[3]),
    close: number(row[4]),
    baseVolume: number(row[5]),
    quoteVolume: Number.isFinite(number(row[7])) ? number(row[7]) : null,
    tradeCount: Number.isFinite(number(row[8])) ? number(row[8]) : null,
    isClosed: closeTime < now,
  };
}

async function fetchBinance(timeframe: BatsTimeframe, limit: number, marketType: MarketType) {
  const errors: string[] = [];
  const bases = marketType === "perpetual" ? ["https://fapi.binance.com"] : binanceEndpoints;
  for (const base of bases) {
    const url = new URL(marketType === "perpetual" ? "/fapi/v1/klines" : "/api/v3/klines", base);
    url.searchParams.set("symbol", "BTCUSDT");
    url.searchParams.set("interval", timeframe);
    url.searchParams.set("limit", String(limit));
    try {
      const data = await getJson(url);
      if (!Array.isArray(data)) throw new Error("non-array response");
      return {
        candles: data
          .map((row) => binanceCandle(row, Date.now()))
          .filter((c): c is Candle => c !== null),
        errors,
      };
    } catch (error) {
      errors.push(`${url.host}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join("; "));
}

function hyperliquidCandle(value: unknown, now: number): Candle | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const openTime = number(row.t);
  const closeTime = number(row.T);
  if (![openTime, closeTime].every(Number.isFinite)) return null;
  const baseVolume = number(row.v);
  return {
    openTime: new Date(openTime).toISOString(),
    closeTime: new Date(closeTime).toISOString(),
    open: number(row.o),
    high: number(row.h),
    low: number(row.l),
    close: number(row.c),
    baseVolume,
    quoteVolume: null,
    tradeCount: Number.isFinite(number(row.n)) ? number(row.n) : null,
    isClosed: closeTime < now,
  };
}

async function fetchHyperliquid(timeframe: BatsTimeframe, limit: number) {
  const intervalMs: Record<BatsTimeframe, number> = {
    "5m": 300000,
    "15m": 900000,
    "1h": 3600000,
    "4h": 14400000,
    "1d": 86400000,
  };
  const endTime = Date.now();
  const data = await postJson("https://api.hyperliquid.xyz/info", {
    type: "candleSnapshot",
    req: {
      coin: "BTC",
      interval: timeframe,
      startTime: endTime - intervalMs[timeframe] * (limit + 2),
      endTime,
    },
  });
  if (!Array.isArray(data)) throw new Error("non-array response");
  return data
    .map((row) => hyperliquidCandle(row, endTime))
    .filter((c): c is Candle => c !== null)
    .slice(-limit);
}

async function fetchSeries(
  timeframe: BatsTimeframe,
  limit: number,
  venue: Venue,
  marketType: MarketType,
  closedOnly: boolean,
  maxAgeMs: number,
): Promise<CandleSeries> {
  const receivedAt = new Date().toISOString();
  const warnings: string[] = [];
  let candles: Candle[] = [];
  let provider = "Binance";
  let actualMarketType: MarketType = marketType;
  let fallback = false;
  const providerLimit = closedOnly ? limit + 1 : limit;
  try {
    if (venue === "hyperliquid") {
      candles = await fetchHyperliquid(timeframe, providerLimit);
      provider = "Hyperliquid";
      actualMarketType = "perpetual";
    } else {
      actualMarketType = venue === "binance_usdm" ? "perpetual" : marketType;
      candles = (await fetchBinance(timeframe, providerLimit, actualMarketType)).candles;
    }
  } catch (error) {
    if (venue !== "auto") throw error;
    warnings.push(`Binance unavailable: ${error instanceof Error ? error.message : String(error)}`);
    candles = await fetchHyperliquid(timeframe, providerLimit);
    provider = "Hyperliquid";
    actualMarketType = "perpetual";
    fallback = true;
  }
  if (closedOnly) candles = candles.filter((candle) => candle.isClosed);
  candles = candles.slice(-limit);
  const checked = validateCandles(candles, timeframe);
  const sourceTimestamp = checked.candles.at(-1)?.closeTime ?? null;
  const ageMs = sourceTimestamp
    ? Math.max(0, Date.parse(receivedAt) - Date.parse(sourceTimestamp))
    : null;
  if (checked.validation.gaps.length)
    warnings.push(`${checked.validation.gaps.length} historical gap(s) detected`);
  return {
    venue:
      provider === "Binance"
        ? `Binance ${actualMarketType === "spot" ? "Spot" : "USD-M"} BTCUSDT`
        : "Hyperliquid BTC perpetual",
    marketType: actualMarketType,
    timeframe,
    candles: checked.candles,
    source: {
      provider,
      venue: provider === "Binance" ? "Binance" : "Hyperliquid",
      instrument: provider === "Binance" ? "BTCUSDT" : "BTC",
      marketType: actualMarketType,
      sourceTimestamp,
      receivedAt,
      ageMs,
      status:
        checked.candles.length === 0
          ? "unavailable"
          : ageMs !== null &&
              ageMs >
                maxAgeMs +
                  (
                    {
                      "5m": 300000,
                      "15m": 900000,
                      "1h": 3600000,
                      "4h": 14400000,
                      "1d": 86400000,
                    } as const
                  )[timeframe]
            ? "stale"
            : checked.validation.valid
              ? "live"
              : "partial",
      method: "public REST historical candles",
      fallback,
      warnings,
    },
    validation: checked.validation,
  };
}

export async function getHistoricalCandles(input: {
  timeframes?: BatsTimeframe[];
  limit?: number;
  venue?: Venue;
  marketType?: MarketType;
  closedOnly?: boolean;
  maxAgeMs?: number;
}) {
  const timeframes = input.timeframes ?? [...BATS_TIMEFRAMES];
  const limit = input.limit ?? 300;
  return Promise.all(
    timeframes.map(async (timeframe) => {
      try {
        return await fetchSeries(
          timeframe,
          limit,
          input.venue ?? "auto",
          input.marketType ?? "spot",
          input.closedOnly ?? true,
          input.maxAgeMs ?? 120000,
        );
      } catch (error) {
        const receivedAt = new Date().toISOString();
        return {
          venue: input.venue ?? "auto",
          marketType: input.marketType ?? "spot",
          timeframe,
          candles: [],
          source: {
            provider: input.venue ?? "auto",
            venue: input.venue ?? "auto",
            instrument: "BTC",
            marketType: input.marketType ?? "spot",
            sourceTimestamp: null,
            receivedAt,
            ageMs: null,
            status: "unavailable" as const,
            method: "public REST historical candles",
            fallback: false,
            warnings: [error instanceof Error ? error.message : String(error)],
          },
          validation: {
            valid: false,
            gaps: [],
            duplicatesRemoved: 0,
            invalidRemoved: 0,
            outOfOrder: false,
          },
        } satisfies CandleSeries;
      }
    }),
  );
}
