import { z } from "zod";
import { getEnv, VERSION } from "@/config/env";
import { fetchMarketData } from "@/clients/market-data-client";
import { normalize } from "@/normalizers/snapshot";
import { toolResult } from "@/utils/output-limit";
import { cacheInfo } from "@/cache/ephemeral-cache";
const tfEnum = z.enum(["5m", "15m", "1h"]);
const timeframes = z.array(tfEnum).default(["5m", "15m", "1h"]);

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  run: (input: Record<string, unknown>) => Promise<unknown>;
};
async function snap(input: { maxAgeMs?: number }) {
  const env = getEnv();
  const max = input.maxAgeMs ?? env.MAX_ACCEPTABLE_DATA_AGE_MS;
  const r = await fetchMarketData(max);
  return normalize(r.payload, r.meta, max);
}
export const tools: ToolDefinition[] = [
  {
    name: "get_btc_intraday_snapshot",
    title: "BTC intraday snapshot",
    description:
      "Comprehensive read-only normalized BTC intraday snapshot: Binance USD-M timeframes, Hyperliquid perpetual context, liquidation aggregates, and Deribit options when supplied. Does not return trade advice or execution.",
    inputSchema: {
      timeframes,
      barSelection: z.enum(["current", "closed", "both"]).default("both"),
      includeOptionsStrikes: z.boolean().default(false),
      maxOptionsExpiries: z.number().int().min(1).max(6).default(3),
      maxStrikesPerExpiry: z.number().int().min(0).max(50).default(12),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
      strict: z.boolean().default(false),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i);
      return toolResult(s, getEnv().MAX_TOOL_RESULT_BYTES);
    },
  },
  {
    name: "get_btc_timeframes",
    title: "BTC Binance timeframes",
    description:
      "Selected 5m, 15m, and 1h Binance USD-M BTCUSDT futures volume and VWAP data. Use for venue-specific intraday volume/VWAP; does not return Hyperliquid volume.",
    inputSchema: {
      timeframes,
      barSelection: z.enum(["current", "closed", "both"]).default("both"),
      maxAgeMs: z.number().int().min(1000).max(3600000).default(120000),
    },
    run: async (i: Record<string, unknown>) => {
      const s = await snap(i);
      return toolResult(
        {
          asOf: s.asOf,
          receivedAt: s.receivedAt,
          timeframes: s.timeframes,
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
      const s = await snap(i);
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
          toolCount: 7,
          overallReadiness: ready,
        },
        getEnv().MAX_TOOL_RESULT_BYTES,
      );
    },
  },
];
