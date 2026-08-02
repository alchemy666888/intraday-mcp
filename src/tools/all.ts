import { z } from "zod";
import { getEnv, VERSION } from "@/config/env";
import { fetchMarketData } from "@/clients/market-data-client";
import {
  fetchBinanceTimeframeFallback,
  mergeBinanceTimeframeFallback,
} from "@/clients/binance-timeframes-client";
import { normalize } from "@/normalizers/snapshot";
import { toolResult } from "@/utils/output-limit";
import { cacheInfo } from "@/cache/ephemeral-cache";
import { BATS_TIMEFRAMES } from "@/domain/market-data";
import { marketHistory, batsFeatures, qualityGate } from "@/services/bats-service";
import { CALCULATION_VERSION, SCHEMA_VERSION } from "@/domain/quality";
import { fetchDirectMarketData } from "@/services/direct-market-data-service";
const tfEnum = z.enum(["5m", "15m", "1h"]);
const timeframes = z.array(tfEnum).default(["5m", "15m", "1h"]);
const barSelection = z.enum(["current", "closed", "both"]).default("both");
const timeframeRequest = z.object({ timeframes, barSelection }).passthrough();

type ToolResult = ReturnType<typeof toolResult>;

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  outputSchema?: z.ZodRawShape;
  run: (input: Record<string, unknown>) => Promise<ToolResult>;
};

export function filterTimeframesForRequest(
  snapshot: { timeframes: object },
  input: Record<string, unknown>,
) {
  const request = timeframeRequest.parse(input);
  const snapshotTimeframes = snapshot.timeframes as Record<string, unknown>;
  return Object.fromEntries(
    request.timeframes.map((tf: z.infer<typeof tfEnum>) => {
      const timeframe = { ...(snapshotTimeframes[tf] as Record<string, unknown>) };
      if (request.barSelection === "current") delete timeframe.closedBar;
      if (request.barSelection === "closed") delete timeframe.currentBar;
      return [tf, timeframe];
    }),
  );
}

async function snap(input: { maxAgeMs?: number }, options: { enrichTimeframes?: boolean } = {}) {
  const env = getEnv();
  const max = input.maxAgeMs ?? env.MAX_ACCEPTABLE_DATA_AGE_MS;
  const [r, direct] = await Promise.all([
    fetchMarketData(max),
    fetchDirectMarketData({
      spot: true,
      timeframes: !!options.enrichTimeframes,
      perpetual: true,
      liquidations: true,
      options: true,
      sessionProfile: "UTC_DEFAULT",
      maxAgeMs: max,
    }),
  ]);
  const snapshot = normalize(r.payload, r.meta, max);
  Object.assign(snapshot, direct);
  if (options.enrichTimeframes) {
    const fallback = await fetchBinanceTimeframeFallback(max);
    return mergeBinanceTimeframeFallback(snapshot, fallback);
  }
  return snapshot;
}
export const tools: ToolDefinition[] = [
  {
    name: "get_btc_market_history",
    title: "BTC Market History",
    description:
      "Return normalized historical BTC OHLCV arrays for deterministic analysis. This read-only tool returns market data only and does not provide trade advice.",
    inputSchema: {
      venue: z.enum(["auto", "binance_spot", "binance_usdm", "hyperliquid"]).default("auto"),
      marketType: z.enum(["spot", "perpetual"]).default("spot"),
      timeframes: z
        .array(z.enum(BATS_TIMEFRAMES))
        .min(1)
        .max(6)
        .default([...BATS_TIMEFRAMES]),
      limit: z.number().int().min(50).max(500).default(300),
      closedOnly: z.boolean().default(true),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
      strict: z.boolean().default(false),
    },
    outputSchema: {
      schemaVersion: z.string(),
      asOf: z.string(),
      market: z.literal("BTC"),
      series: z.array(z.record(z.unknown())),
      quality: z.record(z.unknown()),
    },
    run: async (i) =>
      toolResult(
        await marketHistory(i as Parameters<typeof marketHistory>[0]),
        getEnv().MAX_TOOL_RESULT_BYTES,
      ),
  },
  {
    name: "get_btc_bats_features",
    title: "BTC BATS Features",
    description:
      "Return deterministic closed-candle BATS indicators, trend state, volatility regime, session VWAP, structure, and reference levels. No recommendation or execution.",
    inputSchema: {
      venue: z.enum(["auto", "binance_spot", "binance_usdm", "hyperliquid"]).default("auto"),
      sessionProfile: z.enum(["UTC_DEFAULT", "MYT_TRADING"]).default("UTC_DEFAULT"),
      includeHistory: z.boolean().default(false),
      historyPoints: z.number().int().min(1).max(20).default(3),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
      strict: z.boolean().default(false),
    },
    outputSchema: {
      schemaVersion: z.string(),
      calculationVersion: z.string(),
      asOf: z.string(),
      indicators: z.record(z.unknown()),
      marketState: z.record(z.unknown()),
      structure: z.record(z.unknown()),
      levels: z.record(z.unknown()),
      quality: z.record(z.unknown()),
    },
    run: async (i) =>
      toolResult(
        await batsFeatures(i as Parameters<typeof batsFeatures>[0]),
        getEnv().MAX_TOOL_RESULT_BYTES,
      ),
  },
  {
    name: "get_btc_derivatives_history",
    title: "BTC Derivatives History",
    description:
      "Return venue-labelled perpetual funding, current open interest, basis, and historical OI changes where coverage exists. Does not claim global coverage.",
    inputSchema: {
      venues: z.array(z.enum(["hyperliquid", "binance_usdm"])).default(["hyperliquid"]),
      windows: z
        .array(z.enum(["5m", "15m", "1h", "4h", "24h"]))
        .default(["5m", "15m", "1h", "4h", "24h"]),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    outputSchema: {
      schemaVersion: z.string(),
      asOf: z.string(),
      venues: z.array(z.record(z.unknown())),
      quality: z.record(z.unknown()),
    },
    run: async (i) => {
      const snapshot = await snap(i);
      const requested = i.venues as string[];
      const venues = requested.map((venue) =>
        venue === "hyperliquid"
          ? {
              venue: "Hyperliquid",
              marketType: "perpetual",
              current: snapshot.perpetual,
              basis: null,
              oiChanges: (i.windows as string[]).map((window) => ({
                window,
                value: null,
                status: "unavailable",
                reason: "No durable OI snapshot repository is configured",
              })),
              coverageStart: null,
              globalCoverage: false,
            }
          : {
              venue: "Binance USD-M",
              marketType: "perpetual",
              status: "unavailable",
              reason: "Binance USD-M derivatives collector is not configured",
              globalCoverage: false,
            },
      );
      return toolResult(
        {
          schemaVersion: SCHEMA_VERSION,
          asOf: snapshot.asOf,
          venues,
          quality: {
            completeness: "partial",
            missingFields: ["basis", "oiChanges"],
            warnings: ["Historical OI requires the separately provisioned durable collector"],
          },
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_event_risk",
    title: "BTC Event Risk",
    description:
      "Return structured upcoming or released macro events and material BTC news metadata. Official sources are separated from publisher interpretation.",
    inputSchema: {
      lookbackHours: z.number().int().min(1).max(168).default(24),
      lookaheadHours: z.number().int().min(1).max(168).default(24),
      timezone: z.string().default("Asia/Kuala_Lumpur"),
      includeNews: z.boolean().default(true),
      maxNewsItems: z.number().int().min(0).max(30).default(10),
      maxAgeMs: z.number().int().min(1000).max(86400000).default(900000),
    },
    outputSchema: {
      schemaVersion: z.string(),
      asOf: z.string(),
      events: z.array(z.record(z.unknown())),
      news: z.array(z.record(z.unknown())),
      quality: z.record(z.unknown()),
    },
    run: async () =>
      toolResult(
        {
          schemaVersion: SCHEMA_VERSION,
          asOf: new Date().toISOString(),
          events: [],
          news: [],
          quality: {
            completeness: "unavailable",
            status: "unavailable",
            missingFields: ["events", "news"],
            warnings: [
              "No official macro calendar or licensed BTC news provider is configured; no substitute data was fabricated",
            ],
          },
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      ),
  },
  {
    name: "get_btc_bats_context",
    title: "BTC BATS Context",
    description:
      "Comprehensive timestamp-aligned BTC quantitative context for BATS analysis. Returns evidence and quality gates only; it does not produce forecasts, trade advice, or execution.",
    inputSchema: {
      venuePreference: z.enum(["auto", "spot_first", "perpetual_first"]).default("spot_first"),
      includeLiquidations: z.boolean().default(true),
      includeOptions: z.boolean().default(true),
      includeEventRisk: z.boolean().default(true),
      includeRawCandles: z.boolean().default(false),
      candleLimit: z.number().int().min(50).max(500).default(300),
      sessionProfile: z.enum(["UTC_DEFAULT", "MYT_TRADING"]).default("UTC_DEFAULT"),
      maxCoreAgeMs: z.number().int().min(1000).max(3600000).default(120000),
      strictCore: z.boolean().default(true),
    },
    outputSchema: {
      schemaVersion: z.string(),
      calculationVersion: z.string(),
      asOf: z.string(),
      market: z.literal("BTC"),
      marketState: z.record(z.unknown()),
      indicators: z.record(z.unknown()),
      structure: z.record(z.unknown()),
      levels: z.record(z.unknown()),
      perpetual: z.record(z.unknown()),
      oiChanges: z.array(z.record(z.unknown())),
      liquidations: z.record(z.unknown()),
      options: z.record(z.unknown()),
      eventRisk: z.record(z.unknown()),
      quality: z.record(z.unknown()),
    },
    run: async (i) => {
      const input = i as Record<string, unknown>;
      const [features, snapshot] = await Promise.all([
        batsFeatures({
          venue: input.venuePreference === "perpetual_first" ? "hyperliquid" : "auto",
          limit: Number(input.candleLimit),
          maxAgeMs: Number(input.maxCoreAgeMs),
          strict: false,
          includeHistory: input.includeRawCandles === true,
        }),
        snap({ maxAgeMs: Number(input.maxCoreAgeMs) }),
      ]);
      const includeLiquidations = input.includeLiquidations !== false,
        includeOptions = input.includeOptions !== false;
      const liquidations = includeLiquidations
        ? (snapshot.liquidations as Record<string, unknown>)
        : { status: "unavailable", reason: "not requested" };
      const options = includeOptions
        ? (snapshot.options as Record<string, unknown>)
        : { status: "unavailable", reason: "not requested" };
      const eventRisk = {
        status: "unavailable",
        events: [],
        news: [],
        reason: "No macro/news provider is configured",
        source: null,
      };
      const quality = qualityGate(features, { liquidations, options, eventRiskAvailable: false });
      if (input.strictCore === true && !quality.executionCriticalComplete)
        quality.warnings.push(
          "Strict core gate failed; evidence is returned with insufficient status",
        );
      const sectionTimes = Object.fromEntries(
        Object.entries(features.sources).map(([timeframe, source]) => [
          timeframe,
          source.sourceTimestamp,
        ]),
      );
      return toolResult(
        {
          schemaVersion: SCHEMA_VERSION,
          calculationVersion: CALCULATION_VERSION,
          asOf: features.asOf,
          market: "BTC",
          marketState: features.marketState,
          indicators: features.indicators,
          structure: features.structure,
          levels: features.levels,
          ...(input.includeRawCandles ? { candles: features.history ?? null } : {}),
          perpetual: snapshot.perpetual,
          spot: (snapshot as typeof snapshot & { spot?: unknown }).spot,
          oiChanges: [],
          liquidations,
          options,
          eventRisk,
          alignment: { targetAsOf: features.asOf, sectionSourceTimes: sectionTimes },
          quality,
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_intraday_snapshot",
    title: "BTC intraday snapshot",
    description:
      "Comprehensive read-only normalized BTC intraday snapshot: Binance Spot timeframes, Hyperliquid perpetual context, liquidation aggregates, and Deribit options when supplied. Does not return trade advice or execution.",
    inputSchema: {
      timeframes,
      barSelection,
      includeOptionsStrikes: z.boolean().default(false),
      maxOptionsExpiries: z.number().int().min(1).max(6).default(3),
      maxStrikesPerExpiry: z.number().int().min(0).max(50).default(12),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
      strict: z.boolean().default(false),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i, { enrichTimeframes: true });
      return toolResult(s, getEnv().MAX_TOOL_RESULT_BYTES);
    },
  },
  {
    name: "get_btc_timeframes",
    title: "BTC Binance timeframes",
    description:
      "Selected 5m, 15m, and 1h Binance Spot BTCUSDT volume and VWAP data. Use for venue-specific intraday volume/VWAP; does not return Hyperliquid volume.",
    inputSchema: {
      timeframes,
      barSelection,
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i, { enrichTimeframes: true });
      return toolResult(
        {
          asOf: s.asOf,
          receivedAt: s.receivedAt,
          timeframes: filterTimeframesForRequest(s, i),
          quality: s.quality,
          warnings: s.warnings,
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_perpetual_context",
    title: "BTC Hyperliquid perpetual context",
    description:
      "Hyperliquid BTC mark, mid, oracle, hourly funding, simple APR, and open interest. Use for perpetual context only; does not include Binance VWAP or trade advice.",
    inputSchema: {
      includeAnnualizedFunding: z.boolean().default(true),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i);
      return toolResult(
        { asOf: s.asOf, receivedAt: s.receivedAt, perpetual: s.perpetual, warnings: s.warnings },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_liquidations",
    title: "BTC liquidation aggregates",
    description:
      "Rolling 5m, 15m, and 1h liquidation aggregates plus collector coverage metadata from the upstream collector. Does not claim global coverage unless upstream says so.",
    inputSchema: {
      windows: timeframes,
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i);
      return toolResult(
        {
          asOf: s.asOf,
          receivedAt: s.receivedAt,
          liquidations: s.liquidations,
          warnings: s.warnings,
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_options_surface",
    title: "BTC Deribit options surface",
    description:
      "Deribit BTC options expiries, strikes, ATM IV, 25-delta call/put IV, risk reversal, butterfly, Greeks and OI when supplied. Strikes are bounded and sorted.",
    inputSchema: {
      maxExpiries: z.number().int().min(1).max(6).default(3),
      includeStrikes: z.boolean().default(true),
      maxStrikesPerExpiry: z.number().int().min(0).max(50).default(20),
      minimumOpenInterest: z.number().min(0).default(0),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(300000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i);
      return toolResult(
        { asOf: s.asOf, receivedAt: s.receivedAt, options: s.options, warnings: s.warnings },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
  {
    name: "get_btc_report_context",
    title: "Compact BTC report context",
    description:
      "Compact report-ready quantitative context for ChatGPT: key intraday, perpetual, liquidation, options, quality, warnings, and report guardrails. Does not generate forecasts or recommendations.",
    inputSchema: {
      timeframes,
      includeOptions: z.boolean().default(true),
      includeLiquidations: z.boolean().default(true),
      maxOptionsExpiries: z.number().int().min(1).max(6).default(3),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i, { enrichTimeframes: true });
      const data = {
        asOf: s.asOf,
        market: "BTC",
        spotReferenceUsd: s.perpetual.markPriceUsd,
        intraday: s.timeframes,
        perpetual: s.perpetual,
        liquidations: s.liquidations,
        optionsSummary: s.options,
        crossMarketObservations: {
          fundingDirection:
            s.perpetual.fundingRateHourly === null
              ? "unavailable"
              : s.perpetual.fundingRateHourly > 0
                ? "positive"
                : s.perpetual.fundingRateHourly < 0
                  ? "negative"
                  : "flat",
          oiAvailable: s.perpetual.openInterestBtc !== null,
        },
        quality: s.quality,
        warnings: s.warnings,
        reportInstructions: {
          mustStateUnavailableData: true,
          mustPreserveVenueLabels: true,
          mustStateTimestamp: true,
          mustAvoidFabricatedPrecision: true,
        },
      };
      return toolResult(data, getEnv().MAX_TOOL_RESULT_BYTES);
    },
  },
  {
    name: "get_market_data_health",
    title: "Market data health",
    description:
      "MCP and upstream health summary with reachability, latency, schema type, cache status, tool count, and readiness. Does not expose secrets, stack traces, or full payloads.",
    inputSchema: { includeDiagnostics: z.boolean().default(false) },
    run: async () => {
      let ready = false,
        latency: null | number = null,
        schemaType = "unknown";
      try {
        const r = await fetchMarketData();
        ready = true;
        latency = r.meta.durationMs;
        schemaType = r.payload.btcIntraday ? "enriched" : "legacy";
      } catch {
        // Keep health responses safe: report unavailable without exposing upstream errors.
      }
      return toolResult(
        {
          version: VERSION,
          deploymentEnvironment: process.env.VERCEL_ENV ?? "local",
          upstreamReachable: ready,
          upstreamLatencyMs: latency,
          upstreamSchemaType: schemaType,
          lastSuccessfulFetchTimestamp: cacheInfo().fetchedAt,
          freshness: ready ? "available" : "unavailable",
          cacheStatus: cacheInfo(),
          toolCount: tools.length,
          overallReadiness: ready,
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
];
