import { getHistoricalCandles } from "@/clients/historical-candles-client";
import type { BatsTimeframe } from "@/domain/market-data";
import { CALCULATION_VERSION, SCHEMA_VERSION, type BatsQuality } from "@/domain/quality";
import { buildFeatures } from "@/features/market-state";

export type HistoryInput = {
  venue?: "auto" | "binance_spot" | "binance_usdm" | "hyperliquid";
  marketType?: "spot" | "perpetual";
  timeframes?: BatsTimeframe[];
  limit?: number;
  closedOnly?: boolean;
  maxAgeMs?: number;
  strict?: boolean;
};

export async function marketHistory(input: HistoryInput) {
  const series = await getHistoricalCandles(input);
  const warnings = series.flatMap((item) =>
    item.source.warnings.map((warning) => `${item.timeframe}: ${warning}`),
  );
  const unavailable = series
    .filter((item) => item.source.status === "unavailable")
    .map((item) => item.timeframe);
  const partial = series
    .filter((item) => item.source.status === "partial" || !item.validation.valid)
    .map((item) => item.timeframe);
  if (input.strict && (unavailable.length || partial.length))
    throw new Error(
      `Strict history requirements not met: ${[...unavailable, ...partial].join(", ")}`,
    );
  return {
    schemaVersion: SCHEMA_VERSION,
    asOf: new Date().toISOString(),
    market: "BTC" as const,
    series,
    quality: {
      completeness: unavailable.length ? "partial" : partial.length ? "partial" : "complete",
      unavailableTimeframes: unavailable,
      partialTimeframes: partial,
      warnings,
    },
  };
}

export async function batsFeatures(
  input: HistoryInput & {
    sessionProfile?: string;
    includeHistory?: boolean;
    historyPoints?: number;
  },
) {
  const history = await marketHistory({
    ...input,
    timeframes: ["5m", "15m", "1h", "4h", "1d"],
    limit: Math.max(300, input.limit ?? 300),
    closedOnly: true,
  });
  const built = buildFeatures(
    history.series,
    new Date(history.asOf),
    input.sessionProfile === "MYT_TRADING" ? "MYT_TRADING" : "UTC_DEFAULT",
  );
  const missingFields: string[] = [];
  for (const timeframe of ["5m", "15m", "1h", "4h", "1d"] as const) {
    const values = built.indicators[timeframe];
    if (!values?.ema200.warmupComplete) missingFields.push(`indicators.${timeframe}.ema200`);
  }
  if (!built.levels.dailyUtcVwap.completeFromAnchor)
    missingFields.push("levels.dailyUtcVwap.completeFromAnchor");
  const quality = {
    completeness: missingFields.length ? "partial" : "complete",
    executionCriticalComplete: missingFields.length === 0,
    missingFields,
    warnings: history.quality.warnings,
  };
  if (input.strict && missingFields.length)
    throw new Error(`Strict feature requirements not met: ${missingFields.join(", ")}`);
  return {
    schemaVersion: SCHEMA_VERSION,
    calculationVersion: CALCULATION_VERSION,
    asOf: history.asOf,
    ...built,
    sources: Object.fromEntries(history.series.map((series) => [series.timeframe, series.source])),
    ...(input.includeHistory
      ? {
          history: Object.fromEntries(
            history.series.map((s) => [s.timeframe, s.candles.slice(-(input.historyPoints ?? 3))]),
          ),
        }
      : {}),
    quality,
  };
}

export function qualityGate(
  features: Awaited<ReturnType<typeof batsFeatures>>,
  supplemental: {
    liquidations: Record<string, unknown>;
    options: Record<string, unknown>;
    eventRiskAvailable: boolean;
  },
): BatsQuality {
  const execution = features.quality.executionCriticalComplete;
  const regime =
    features.marketState.volatility !== "X" &&
    features.indicators["1h"]?.ema200.warmupComplete === true &&
    features.indicators["4h"]?.ema200.warmupComplete === true;
  const liquidation = supplemental.liquidations.status !== "unavailable";
  const options =
    supplemental.options.status !== "unavailable" && supplemental.options.status !== "error";
  const missingFields = [...features.quality.missingFields];
  const unavailableFields = [
    ...(!liquidation ? ["liquidations"] : []),
    ...(!options ? ["options"] : []),
    ...(!supplemental.eventRiskAvailable ? ["eventRisk"] : []),
  ];
  const optional = options && supplemental.eventRiskAvailable;
  return {
    executionCriticalComplete: execution,
    regimeCriticalComplete: regime,
    strategySpecificComplete: { C1LiquidationReversal: liquidation },
    optionalContextComplete: optional,
    completeness:
      execution && regime
        ? optional && liquidation
          ? "complete"
          : "core_complete"
        : execution
          ? "partial"
          : "insufficient",
    missingFields,
    staleFields: [],
    unavailableFields,
    warnings: [
      ...features.quality.warnings,
      ...unavailableFields.map(
        (field) => `${field} unavailable; affected analysis only is disabled`,
      ),
    ],
  };
}
