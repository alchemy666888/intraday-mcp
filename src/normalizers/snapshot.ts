import type { UpstreamAny } from "@/schemas/upstream-v2";
import type { FetchMeta } from "@/clients/market-data-client";
import { finite } from "@/utils/finite-number";
import { ageMs, statusFor, validIso } from "@/utils/timestamps";
const tfs = ["5m", "15m", "1h"] as const;
type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
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
    reason: present ? null : "upstream section missing",
    warnings,
  };
};
export function normalize(up: UpstreamAny, fm: FetchMeta, maxAgeMs: number) {
  const receivedAt = fm.receivedAt;
  const btc = obj(up.btcIntraday);
  const enriched = !!up.btcIntraday;
  const asOf = validIso(btc.asOf) ?? validIso(up.timestamp) ?? receivedAt;
  const warnings: string[] = [];
  if (!enriched)
    warnings.push("btcIntraday enriched profile is absent; enriched metrics are unavailable");
  if (fm.cacheStatus === "stale-if-error")
    warnings.push("served from stale ephemeral cache after upstream error");
  const tfRoot = obj(btc.timeframes);
  const timeframes: object = Object.fromEntries(
    tfs.map((tf) => {
      const o = obj(tfRoot[tf]);
      const base = num(o, "baseVolumeBtc", "baseVolume", "volumeBtc");
      const quote = num(o, "quoteVolumeUsd", "quoteVolume");
      const vwap = num(o, "vwapUsd", "vwap") ?? (base && quote ? quote / base : null);
      return [
        tf,
        {
          ...meta(
            "canonical market-data API",
            "Binance USD-M BTCUSDT futures",
            asOf,
            receivedAt,
            maxAgeMs,
            enriched && Object.keys(o).length > 0,
          ),
          timeframe: tf,
          units: { baseVolumeBtc: "BTC", quoteVolumeUsd: "USD", vwapUsd: "USD/BTC" },
          baseVolumeBtc: base,
          quoteVolumeUsd: quote,
          vwapUsd: vwap,
          tradeCount: num(o, "tradeCount", "trades"),
          takerBuyBaseVolumeBtc: num(o, "takerBuyBaseVolumeBtc"),
          takerBuyQuoteVolumeUsd: num(o, "takerBuyQuoteVolumeUsd"),
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
