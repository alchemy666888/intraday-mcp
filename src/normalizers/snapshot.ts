import type { UpstreamAny } from "@/schemas/upstream-v2";
import type { FetchMeta } from "@/clients/market-data-client";
import { finite } from "@/utils/finite-number";
import { ageMs, statusFor, validIso } from "@/utils/timestamps";
const tfs = ["5m", "15m", "1h"] as const;
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const stringArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.length > 0) : [];
const firstString = (...values: unknown[]) =>
  values.find((v): v is string => typeof v === "string" && v.length > 0) ?? null;
const uniq = (values: string[]) => [...new Set(values)];
const num = (o: Obj, ...keys: string[]) => {
  for (const k of keys) {
    const v = finite(o[k], {
      allowNegative:
        k.toLowerCase().includes("funding") ||
        k.toLowerCase().includes("skew") ||
        k.toLowerCase().includes("theta"),
    });
    if (v !== null) return v;
  }
  return null;
};
const meta = (
  source: string,
  venue: string,
  asOf: string | null,
  receivedAt: string,
  maxAgeMs: number,
  present = true,
  warnings: string[] = [],
  unavailableReason: string | null = null,
) => {
  const age = ageMs(asOf, receivedAt);
  return {
    source,
    venue,
    asOf,
    receivedAt,
    ageMs: age,
    status: statusFor(age, maxAgeMs, present),
    method: "validated upstream normalization",
    reason: present ? null : (unavailableReason ?? "upstream section missing"),
    warnings,
  };
};
const hasTimeframeKeys = (o: Obj) => tfs.some((tf) => Object.keys(obj(o[tf])).length > 0);
const timeframeKey = (o: Obj) => {
  const value = o.timeframe ?? o.window ?? o.interval;
  return typeof value === "string" && (tfs as readonly string[]).includes(value) ? value : null;
};
const timeframeRootFromArray = (items: unknown[]) => {
  const entries = items.flatMap((item) => {
    const o = obj(item);
    const key = timeframeKey(o);
    return key ? ([[key, o]] as const) : [];
  });
  return entries.length > 0 ? Object.fromEntries(entries) : {};
};
const timeframeRoot = (value: unknown) => {
  if (Array.isArray(value)) return timeframeRootFromArray(value);
  const o = obj(value);
  if (hasTimeframeKeys(o)) return o;
  for (const key of ["windows", "byTimeframe", "data", "bars", "klines", "candles", "intervals"]) {
    const nested = o[key];
    if (Array.isArray(nested)) {
      const root = timeframeRootFromArray(nested);
      if (hasTimeframeKeys(root)) return root;
      continue;
    }
    const root = obj(nested);
    if (hasTimeframeKeys(root)) return root;
  }
  return {};
};
const firstTimeframeRoot = (...roots: Obj[]) => {
  const candidates = roots.flatMap((root) => [
    root.timeframes,
    root.binanceTimeframes,
    root.binanceUsdMTimeframes,
    root.binanceFuturesTimeframes,
    root.binanceKlines,
    root.klines,
    root.candles,
    obj(root.binance).timeframes,
    obj(root.binanceUsdM).timeframes,
    obj(root.binanceFutures).timeframes,
    obj(root.binance).klines,
    obj(root.binanceUsdM).klines,
    obj(root.binanceFutures).klines,
  ]);
  for (const candidate of candidates) {
    const root = timeframeRoot(candidate);
    if (hasTimeframeKeys(root)) return root;
  }
  return {};
};
export function normalize(up: UpstreamAny, fm: FetchMeta, maxAgeMs: number) {
  const receivedAt = fm.receivedAt;
  const root = obj(up);
  const btc = obj(up.btcIntraday);
  const enriched = !!up.btcIntraday;
  const asOf = validIso(btc.asOf) ?? validIso(up.timestamp) ?? receivedAt;
  const upstreamQuality = obj(btc.quality);
  const upstreamWarnings = stringArray(upstreamQuality.warnings);
  const warnings: string[] = [];
  if (!enriched)
    warnings.push("btcIntraday enriched profile is absent; enriched metrics are unavailable");
  if (fm.cacheStatus === "stale-if-error")
    warnings.push("served from stale ephemeral cache after upstream error");
  warnings.push(...upstreamWarnings);
  const tfRoot = firstTimeframeRoot(btc, root);
  const timeframeSection = obj(btc.timeframes);
  const binanceSource = obj(obj(upstreamQuality.sources).binance);
  const binanceReason = firstString(timeframeSection.reason, binanceSource.reason);
  const binanceWarnings = uniq([
    ...stringArray(timeframeSection.warnings),
    ...upstreamWarnings.filter((warning) => warning.toLowerCase().includes("binance")),
  ]);
  const timeframes: object = Object.fromEntries(
    tfs.map((tf) => {
      const o = obj(tfRoot[tf]);
      const base = num(o, "baseVolumeBtc", "baseVolume", "volumeBtc", "volume", "v");
      const quote = num(o, "quoteVolumeUsd", "quoteVolume", "volumeUsd", "quoteAssetVolume", "q");
      const vwap =
        num(o, "vwapUsd", "vwap") ??
        (base !== null && base > 0 && quote !== null ? quote / base : null);
      const present = enriched && Object.keys(o).length > 0;
      return [
        tf,
        {
          ...meta(
            "canonical market-data API",
            "Binance USD-M BTCUSDT futures",
            asOf,
            receivedAt,
            maxAgeMs,
            present,
            present ? [] : binanceWarnings,
            binanceReason,
          ),
          timeframe: tf,
          units: { baseVolumeBtc: "BTC", quoteVolumeUsd: "USD", vwapUsd: "USD/BTC" },
          baseVolumeBtc: base,
          quoteVolumeUsd: quote,
          vwapUsd: vwap,
          tradeCount: num(o, "tradeCount", "trades", "numberOfTrades", "n"),
          takerBuyBaseVolumeBtc: num(o, "takerBuyBaseVolumeBtc", "takerBuyBaseAssetVolume"),
          takerBuyQuoteVolumeUsd: num(o, "takerBuyQuoteVolumeUsd", "takerBuyQuoteAssetVolume"),
          currentBar: obj(o.currentBar),
          closedBar: obj(o.closedBar),
        },
      ];
    }),
  );
  const p = obj(btc.perpetual);
  const mark = num(p, "markPriceUsd", "markPx", "markPrice");
  const oiBtc = num(p, "openInterestBtc", "openInterest");
  const funding = num(p, "fundingRateHourly", "funding");
  const perpetual = {
    ...meta(
      "canonical market-data API",
      "Hyperliquid",
      asOf,
      receivedAt,
      maxAgeMs,
      enriched && Object.keys(p).length > 0,
    ),
    units: { prices: "USD", fundingRateHourly: "decimal hourly", openInterestBtc: "BTC" },
    markPriceUsd: mark,
    midPriceUsd: num(p, "midPriceUsd", "midPx"),
    oraclePriceUsd: num(p, "oraclePriceUsd", "oraclePx"),
    fundingRateHourly: funding,
    fundingAprSimple: funding === null ? null : funding * 24 * 365,
    openInterestBtc: oiBtc,
    openInterestUsd: oiBtc !== null && mark !== null ? oiBtc * mark : null,
    calculatedFields: ["fundingAprSimple", "openInterestUsd"],
  };
  const liqRoot = obj(btc.liquidations);
  const liquidations = Object.fromEntries(
    tfs.map((w) => {
      const o = obj(liqRoot[w]);
      const long = num(o, "longLiquidationUsd", "longUsd");
      const short = num(o, "shortLiquidationUsd", "shortUsd");
      return [
        w,
        {
          ...meta(
            "canonical market-data API",
            "upstream liquidation collector venue coverage",
            asOf,
            receivedAt,
            maxAgeMs,
            enriched && Object.keys(o).length > 0,
          ),
          window: w,
          exactness: "upstream aggregate",
          collectorConnected: liqRoot.collectorConnected ?? null,
          collectorLastEventAt: validIso(liqRoot.collectorLastEventAt) ?? null,
          coverageStartAt: validIso(liqRoot.coverageStartAt) ?? null,
          longLiquidationUsd: long,
          shortLiquidationUsd: short,
          totalLiquidationUsd:
            num(o, "totalLiquidationUsd", "totalUsd") ??
            (long !== null && short !== null ? long + short : null),
          eventCount: num(o, "eventCount", "count"),
          largestLiquidationUsd: num(o, "largestLiquidationUsd"),
          lastEventAt: validIso(o.lastEventAt) ?? null,
        },
      ];
    }),
  );
  const optRoot = obj(btc.options);
  const expiries = Array.isArray(optRoot.expiries)
    ? optRoot.expiries
        .map((e) => {
          const o = obj(e);
          const call = num(o, "call25DeltaIvPct", "call25DeltaIv", "call25dIvPct");
          const put = num(o, "put25DeltaIvPct", "put25DeltaIv", "put25dIvPct");
          const atm = num(o, "atmIvPct", "atmIv");
          return {
            ...meta(
              "canonical market-data API",
              "Deribit BTC options",
              asOf,
              receivedAt,
              maxAgeMs,
              true,
            ),
            expiration: String(o.expiration ?? ""),
            expirationTimestamp: validIso(o.expirationTimestamp) ?? null,
            daysToExpiry: num(o, "daysToExpiry"),
            underlyingPriceUsd: num(o, "underlyingPriceUsd"),
            atmStrikeUsd: num(o, "atmStrikeUsd"),
            atmIvPct: atm,
            call25DeltaIvPct: call,
            put25DeltaIvPct: put,
            riskReversal25dVolPoints: call !== null && put !== null ? call - put : null,
            butterfly25dVolPoints:
              call !== null && put !== null && atm !== null ? (call + put) / 2 - atm : null,
            selectionMethod: o.selectionMethod ?? null,
            selectedInstruments: o.selectedInstruments ?? [],
            strikes: Array.isArray(o.strikes) ? o.strikes : [],
            warnings: [],
          };
        })
        .sort((a, b) => String(a.expirationTimestamp).localeCompare(String(b.expirationTimestamp)))
    : [];
  const options = {
    ...meta(
      "canonical market-data API",
      "Deribit BTC options",
      asOf,
      receivedAt,
      maxAgeMs,
      enriched && expiries.length > 0,
    ),
    expiries,
  };
  const enrichedSectionCompleteness = {
    timeframes: Object.keys(tfRoot).length > 0,
    perpetual: Object.keys(p).length > 0,
    liquidations: Object.keys(liqRoot).length > 0,
    options: expiries.length > 0,
  };
  const hasAllEnrichedSections = Object.values(enrichedSectionCompleteness).every(Boolean);
  const completeness = enriched
    ? hasAllEnrichedSections
      ? "enriched"
      : "partial-enriched"
    : "legacy-only";
  return {
    schemaVersion: "1.0.0",
    asOf,
    receivedAt,
    status: enriched ? statusFor(ageMs(asOf, receivedAt), maxAgeMs, true) : "partial",
    sourceAttribution: {
      upstream: "https://alchemy666888.vercel.app/api/hyperliquid?profile=btc-intraday",
      canonicalSource: "canonical market-data API",
    },
    timeframes,
    perpetual,
    liquidations,
    options,
    legacyContext: enriched
      ? null
      : {
          source: up.source ?? null,
          timestamp: up.timestamp ?? null,
          prices: up.prices ?? null,
          assets: up.assets ?? null,
        },
    quality: {
      freshnessMs: ageMs(asOf, receivedAt),
      completeness,
      cacheStatus: fm.cacheStatus,
      warnings,
    },
    warnings,
  };
}
