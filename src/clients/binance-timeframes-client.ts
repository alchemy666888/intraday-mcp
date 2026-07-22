import { finite } from "@/utils/finite-number";
import { ageMs, statusFor } from "@/utils/timestamps";

const timeframes = ["5m", "15m", "1h"] as const;
type Timeframe = (typeof timeframes)[number];
type Obj = Record<string, unknown>;

const endpoints = [
  { name: "fapi.binance.com", baseUrl: "https://fapi.binance.com" },
  { name: "fapi1.binance.com", baseUrl: "https://fapi1.binance.com" },
  { name: "fapi2.binance.com", baseUrl: "https://fapi2.binance.com" },
  { name: "fapi3.binance.com", baseUrl: "https://fapi3.binance.com" },
  { name: "fapi4.binance.com", baseUrl: "https://fapi4.binance.com" },
  { name: "data-api.binance.vision", baseUrl: "https://data-api.binance.vision" },
];

type Kline = {
  openTime: number;
  openUsd: number;
  highUsd: number;
  lowUsd: number;
  closeUsd: number;
  closeTime: number;
  baseVolumeBtc: number;
  quoteVolumeUsd: number;
  tradeCount: number;
  takerBuyBaseVolumeBtc: number;
  takerBuyQuoteVolumeUsd: number;
};

export type BinanceTimeframeFallback = {
  timeframes: Partial<Record<Timeframe, Obj>>;
  diagnostics: string[];
};

const iso = (ms: number) => new Date(ms).toISOString();

const rowNumber = (row: unknown[], index: number) => finite(row[index]);

const parseKline = (row: unknown): Kline | null => {
  if (!Array.isArray(row)) return null;
  const openTime = rowNumber(row, 0);
  const openUsd = rowNumber(row, 1);
  const highUsd = rowNumber(row, 2);
  const lowUsd = rowNumber(row, 3);
  const closeUsd = rowNumber(row, 4);
  const baseVolumeBtc = rowNumber(row, 5);
  const closeTime = rowNumber(row, 6);
  const quoteVolumeUsd = rowNumber(row, 7);
  const tradeCount = rowNumber(row, 8);
  const takerBuyBaseVolumeBtc = rowNumber(row, 9);
  const takerBuyQuoteVolumeUsd = rowNumber(row, 10);

  if (
    openTime === null ||
    openUsd === null ||
    highUsd === null ||
    lowUsd === null ||
    closeUsd === null ||
    baseVolumeBtc === null ||
    closeTime === null ||
    quoteVolumeUsd === null ||
    tradeCount === null ||
    takerBuyBaseVolumeBtc === null ||
    takerBuyQuoteVolumeUsd === null
  ) {
    return null;
  }

  return {
    openTime,
    openUsd,
    highUsd,
    lowUsd,
    closeUsd,
    closeTime,
    baseVolumeBtc,
    quoteVolumeUsd,
    tradeCount,
    takerBuyBaseVolumeBtc,
    takerBuyQuoteVolumeUsd,
  };
};

const bar = (kline: Kline | undefined) => {
  if (!kline) return {};
  const vwapUsd = kline.baseVolumeBtc > 0 ? kline.quoteVolumeUsd / kline.baseVolumeBtc : null;
  return {
    openTime: iso(kline.openTime),
    closeTime: iso(kline.closeTime),
    openUsd: kline.openUsd,
    highUsd: kline.highUsd,
    lowUsd: kline.lowUsd,
    closeUsd: kline.closeUsd,
    baseVolumeBtc: kline.baseVolumeBtc,
    quoteVolumeUsd: kline.quoteVolumeUsd,
    vwapUsd,
    tradeCount: kline.tradeCount,
    takerBuyBaseVolumeBtc: kline.takerBuyBaseVolumeBtc,
    takerBuyQuoteVolumeUsd: kline.takerBuyQuoteVolumeUsd,
  };
};

const sectionFromKlines = (
  timeframe: Timeframe,
  rows: unknown[],
  receivedAt: string,
  maxAgeMs: number,
  endpointName: string,
) => {
  const parsed = rows
    .map(parseKline)
    .filter((row): row is Kline => row !== null)
    .sort((a, b) => a.openTime - b.openTime);
  if (parsed.length === 0) return null;

  const now = Date.parse(receivedAt);
  const latest = parsed.at(-1);
  const latestIsCurrent = latest !== undefined && latest.closeTime >= now;
  const current = latestIsCurrent ? latest : undefined;
  const closed = latestIsCurrent ? parsed.at(-2) : latest;
  const selected = current ?? closed;
  if (!selected) return null;

  const asOf = current ? receivedAt : iso(selected.closeTime);
  const age = ageMs(asOf, receivedAt);
  const vwapUsd =
    selected.baseVolumeBtc > 0 ? selected.quoteVolumeUsd / selected.baseVolumeBtc : null;

  return {
    source: "Binance USD-M public REST API",
    venue: "Binance USD-M BTCUSDT futures",
    asOf,
    receivedAt,
    ageMs: age,
    status: statusFor(age, maxAgeMs, true),
    method: `direct Binance USD-M klines fallback (${endpointName})`,
    reason: null,
    warnings: [],
    timeframe,
    units: { baseVolumeBtc: "BTC", quoteVolumeUsd: "USD", vwapUsd: "USD/BTC" },
    baseVolumeBtc: selected.baseVolumeBtc,
    quoteVolumeUsd: selected.quoteVolumeUsd,
    vwapUsd,
    tradeCount: selected.tradeCount,
    takerBuyBaseVolumeBtc: selected.takerBuyBaseVolumeBtc,
    takerBuyQuoteVolumeUsd: selected.takerBuyQuoteVolumeUsd,
    currentBar: bar(current),
    closedBar: bar(closed),
  };
};

const bodyPrefix = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 180);

const fetchRows = async (
  timeframe: Timeframe,
  maxAgeMs: number,
): Promise<{ rows: unknown[]; endpointName: string; diagnostics: string[] }> => {
  const diagnostics: string[] = [];
  const timeoutMs = Math.min(2500, Math.max(750, Math.floor(maxAgeMs / 8)));

  for (const endpoint of endpoints) {
    const url = new URL("/fapi/v1/klines", endpoint.baseUrl);
    url.searchParams.set("symbol", "BTCUSDT");
    url.searchParams.set("interval", timeframe);
    url.searchParams.set("limit", "2");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      const text = await response.text();
      if (response.status !== 200) {
        diagnostics.push(
          `${timeframe} ${endpoint.name} HTTP ${response.status}: ${bodyPrefix(text)}`,
        );
        continue;
      }

      const json: unknown = JSON.parse(text);
      if (!Array.isArray(json)) {
        diagnostics.push(`${timeframe} ${endpoint.name} returned non-array JSON`);
        continue;
      }

      return { rows: json, endpointName: endpoint.name, diagnostics };
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? `timeout after ${timeoutMs}ms`
          : String(error);
      diagnostics.push(`${timeframe} ${endpoint.name} ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { rows: [], endpointName: "", diagnostics };
};

export async function fetchBinanceTimeframeFallback(
  maxAgeMs: number,
  receivedAt = new Date().toISOString(),
): Promise<BinanceTimeframeFallback> {
  const results = await Promise.all(
    timeframes.map(async (timeframe) => {
      const { rows, endpointName, diagnostics } = await fetchRows(timeframe, maxAgeMs);
      const section =
        rows.length > 0
          ? sectionFromKlines(timeframe, rows, receivedAt, maxAgeMs, endpointName)
          : null;
      return { timeframe, section, diagnostics };
    }),
  );

  return {
    timeframes: Object.fromEntries(
      results.flatMap(({ timeframe, section }) =>
        section ? ([[timeframe, section]] as const) : [],
      ),
    ),
    diagnostics: results.flatMap(({ diagnostics }) => diagnostics),
  };
}

const uniq = (values: string[]) => [...new Set(values.filter(Boolean))];

const sectionPresent = (section: Obj | undefined) =>
  section !== undefined && section.status !== "unavailable";

export function mergeBinanceTimeframeFallback<
  T extends { timeframes: object; quality: Obj; warnings: string[] },
>(snapshot: T, fallback: BinanceTimeframeFallback): T {
  const existing = snapshot.timeframes as Record<Timeframe, Obj>;
  const diagnostics = uniq(fallback.diagnostics);
  const fallbackWarning =
    diagnostics.length > 0
      ? `Binance USD-M direct kline fallback diagnostics: ${diagnostics.join(" | ")}`
      : null;
  const filledWarning =
    Object.keys(fallback.timeframes).length > 0
      ? "btcIntraday.timeframes filled from direct Binance USD-M public REST API fallback"
      : null;

  const timeframesOut = Object.fromEntries(
    timeframes.map((timeframe) => {
      const fallbackSection = fallback.timeframes[timeframe];
      if (fallbackSection && !sectionPresent(existing[timeframe])) {
        return [timeframe, fallbackSection];
      }

      if (!sectionPresent(existing[timeframe]) && fallbackWarning) {
        return [
          timeframe,
          {
            ...existing[timeframe],
            reason:
              existing[timeframe]?.reason === "upstream section missing"
                ? "Binance USD-M klines unavailable from upstream and direct fallback"
                : existing[timeframe]?.reason,
            warnings: uniq([
              ...((existing[timeframe]?.warnings as string[] | undefined) ?? []),
              fallbackWarning,
            ]),
          },
        ];
      }

      return [timeframe, existing[timeframe]];
    }),
  );

  const warnings = uniq([
    ...snapshot.warnings,
    ...((snapshot.quality.warnings as string[] | undefined) ?? []),
    ...(filledWarning ? [filledWarning] : []),
    ...(fallbackWarning && Object.keys(fallback.timeframes).length === 0 ? [fallbackWarning] : []),
  ]);

  return {
    ...snapshot,
    timeframes: timeframesOut,
    quality: { ...snapshot.quality, warnings },
    warnings,
  };
}
