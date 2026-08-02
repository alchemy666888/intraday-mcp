import type { Candle, CandleSeries } from "@/domain/market-data";
import { indicators } from "@/features/indicators";

export function sessionVwap(candles: Candle[], anchor: Date) {
  const selected = candles.filter((candle) => Date.parse(candle.openTime) >= anchor.getTime());
  let volume = 0,
    value = 0;
  for (const candle of selected) {
    volume += candle.baseVolume;
    if (candle.quoteVolume !== null) value += candle.quoteVolume;
  }
  const vwap = volume > 0 ? value / volume : null;
  const latest = selected.at(-1)?.close ?? null;
  return {
    anchor: anchor.toISOString(),
    value: vwap,
    deviationPct: vwap && latest ? ((latest - vwap) / vwap) * 100 : null,
    completeFromAnchor:
      selected.length > 0 && Date.parse(selected[0].openTime) === anchor.getTime(),
    method: "sum_quote_volume_divided_by_sum_base_volume",
    sourceBars: selected.length,
    lastIncludedBarTime: selected.at(-1)?.openTime ?? null,
    currentBarIncluded: selected.some((candle) => !candle.isClosed),
    reason:
      volume === 0
        ? "zero_base_volume"
        : selected.some((c) => c.quoteVolume === null)
          ? "missing_quote_volume"
          : null,
  };
}

export function confirmedPivots(candles: Candle[], wings = 2) {
  const highs: Array<{ time: string; price: number }> = [],
    lows: Array<{ time: string; price: number }> = [];
  for (let index = wings; index < candles.length - wings; index++) {
    const around = candles.slice(index - wings, index + wings + 1),
      candle = candles[index];
    if (around.every((other, i) => i === wings || candle.high > other.high))
      highs.push({ time: candle.closeTime, price: candle.high });
    if (around.every((other, i) => i === wings || candle.low < other.low))
      lows.push({ time: candle.closeTime, price: candle.low });
  }
  return { method: "confirmed_pivot_2x2", highs: highs.slice(-5), lows: lows.slice(-5) };
}

export function buildFeatures(
  series: CandleSeries[],
  asOf = new Date(),
  sessionProfile: "UTC_DEFAULT" | "MYT_TRADING" = "UTC_DEFAULT",
) {
  const byTimeframe = Object.fromEntries(series.map((item) => [item.timeframe, item]));
  const indicatorSet = Object.fromEntries(
    series.map((item) => [item.timeframe, indicators(item.candles)]),
  );
  const oneHour = indicatorSet["1h"],
    fourHour = indicatorSet["4h"];
  const bullish =
    oneHour?.ema20.current &&
    oneHour?.ema50.current &&
    oneHour?.ema200.current &&
    fourHour?.ema20.current &&
    fourHour?.ema50.current &&
    fourHour?.ema200.current &&
    oneHour.ema20.current > oneHour.ema50.current &&
    oneHour.ema50.current > oneHour.ema200.current &&
    fourHour.ema20.current > fourHour.ema50.current &&
    fourHour.ema50.current > fourHour.ema200.current;
  const bearish =
    oneHour?.ema20.current &&
    oneHour?.ema50.current &&
    oneHour?.ema200.current &&
    fourHour?.ema20.current &&
    fourHour?.ema50.current &&
    fourHour?.ema200.current &&
    oneHour.ema20.current < oneHour.ema50.current &&
    oneHour.ema50.current < oneHour.ema200.current &&
    fourHour.ema20.current < fourHour.ema50.current &&
    fourHour.ema50.current < fourHour.ema200.current;
  const adx = oneHour?.adx14.current;
  const trend = bullish
    ? "bullish_trend"
    : bearish
      ? "bearish_trend"
      : adx !== null && adx !== undefined && adx < 20
        ? "range"
        : "transition";
  const dailyAtr = indicatorSet["1d"]?.atr14.current;
  const dailyCandles = byTimeframe["1d"]?.candles ?? [];
  const dailyAtrHistory = dailyCandles.length
    ? awaitlessAtr(dailyCandles).filter((x): x is number => x !== null)
    : [];
  const average20 =
    dailyAtrHistory.length >= 20
      ? dailyAtrHistory.slice(-20).reduce((a, b) => a + b, 0) / 20
      : null;
  const ratio = dailyAtr && average20 ? dailyAtr / average20 : null;
  const volatility = ratio === null ? "X" : ratio > 1.5 ? "H" : ratio < 0.7 ? "L" : "N";
  const utcAnchor = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
  );
  const fiveMinute = byTimeframe["5m"]?.candles ?? [];
  const oneHourCandles = byTimeframe["1h"]?.candles ?? [];
  const fourHourCandles = byTimeframe["4h"]?.candles ?? [];
  const priorDay = dailyCandles.filter((c) => c.isClosed).at(-2);
  const monday = new Date(utcAnchor);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekOpen =
    dailyCandles.find((c) => Date.parse(c.openTime) >= monday.getTime())?.open ?? null;
  const sessionHours =
    sessionProfile === "MYT_TRADING"
      ? { asia: 16, europe: 7, us: 13 }
      : { asia: 0, europe: 7, us: 13 };
  const sessionLevels = Object.fromEntries(
    Object.entries(sessionHours).map(([name, hour]) => {
      const anchor = new Date(utcAnchor);
      anchor.setUTCHours(hour);
      if (anchor > asOf) anchor.setUTCDate(anchor.getUTCDate() - 1);
      const bars = fiveMinute.filter(
        (candle) => candle.isClosed && Date.parse(candle.openTime) >= anchor.getTime(),
      );
      return [
        name,
        {
          ...sessionVwap(fiveMinute, anchor),
          high: bars.length ? Math.max(...bars.map((candle) => candle.high)) : null,
          low: bars.length ? Math.min(...bars.map((candle) => candle.low)) : null,
        },
      ];
    }),
  );
  return {
    indicators: indicatorSet,
    marketState: {
      trend,
      batsTrendCode: trend === "range" ? "R" : trend === "transition" ? "X" : "T",
      volatility,
      code: `${trend === "range" ? "R" : trend === "transition" ? "X" : "T"}${volatility}`,
      evidence: {
        oneHourAdx14: adx ?? null,
        dailyAtr14: dailyAtr ?? null,
        dailyAtrAverage20: average20,
        atrRegimeRatio: ratio,
      },
    },
    structure: { "1h": confirmedPivots(oneHourCandles), "4h": confirmedPivots(fourHourCandles) },
    levels: {
      dailyUtcVwap: sessionVwap(fiveMinute, utcAnchor),
      priorDay: priorDay
        ? {
            high: priorDay.high,
            low: priorDay.low,
            close: priorDay.close,
            closeTime: priorDay.closeTime,
          }
        : null,
      currentWeek: { anchor: monday.toISOString(), open: weekOpen },
      sessions: { profile: sessionProfile, ...sessionLevels },
    },
  };
}

// Local import avoidance keeps the public feature result small and deterministic.
import { atrAdx } from "@/features/indicators";
const awaitlessAtr = (candles: Candle[]) => atrAdx(candles).atr;
