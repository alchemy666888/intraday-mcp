import { type BatsTimeframe, type Candle, timeframeMs } from "@/domain/market-data";

export function validateCandles(candles: Candle[], timeframe: BatsTimeframe) {
  const outOfOrder = candles.some(
    (candle, index) =>
      index > 0 && Date.parse(candle.openTime) < Date.parse(candles[index - 1].openTime),
  );
  let invalidRemoved = 0;
  const valid = candles.filter((candle) => {
    const numbers = [candle.open, candle.high, candle.low, candle.close, candle.baseVolume];
    const okay =
      numbers.every(Number.isFinite) &&
      candle.baseVolume >= 0 &&
      candle.high >= Math.max(candle.open, candle.close, candle.low) &&
      candle.low <= Math.min(candle.open, candle.close, candle.high) &&
      Date.parse(candle.closeTime) > Date.parse(candle.openTime);
    if (!okay) invalidRemoved++;
    return okay;
  });
  valid.sort((a, b) => Date.parse(a.openTime) - Date.parse(b.openTime));
  const unique = new Map(valid.map((candle) => [candle.openTime, candle]));
  const normalized = [...unique.values()];
  const gaps: Array<{ after: string; before: string; missingBars: number }> = [];
  for (let index = 1; index < normalized.length; index++) {
    const difference =
      Date.parse(normalized[index].openTime) - Date.parse(normalized[index - 1].openTime);
    if (difference !== timeframeMs[timeframe]) {
      gaps.push({
        after: normalized[index - 1].openTime,
        before: normalized[index].openTime,
        missingBars: Math.max(0, Math.round(difference / timeframeMs[timeframe]) - 1),
      });
    }
  }
  return {
    candles: normalized,
    validation: {
      valid: invalidRemoved === 0 && gaps.length === 0,
      gaps,
      duplicatesRemoved: valid.length - normalized.length,
      invalidRemoved,
      outOfOrder,
    },
  };
}
