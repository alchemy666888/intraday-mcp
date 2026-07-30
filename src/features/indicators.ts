import type { Candle } from "@/domain/market-data";

export type CurrentPrior = {
  current: number | null;
  prior: number | null;
  warmupComplete: boolean;
};
const round = (value: number | null) =>
  value === null || !Number.isFinite(value) ? null : Number(value.toFixed(10));
const lastTwo = (values: Array<number | null>, minimum: number): CurrentPrior => ({
  current: round(values.at(-1) ?? null),
  prior: round(values.at(-2) ?? null),
  warmupComplete: values.length >= minimum && values.at(-1) !== null,
});

export function ema(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return result;
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = current;
  const multiplier = 2 / (period + 1);
  for (let index = period; index < values.length; index++) {
    current = (values[index] - current) * multiplier + current;
    result[index] = current;
  }
  return result;
}

export function wilder(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return result;
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  result[period - 1] = current;
  for (let index = period; index < values.length; index++) {
    current = (current * (period - 1) + values[index]) / period;
    result[index] = current;
  }
  return result;
}

export function rsi(values: number[], period = 14): Array<number | null> {
  const output: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return output;
  const gains = values.slice(1).map((value, index) => Math.max(0, value - values[index]));
  const losses = values.slice(1).map((value, index) => Math.max(0, values[index] - value));
  const avgGain = wilder(gains, period);
  const avgLoss = wilder(losses, period);
  for (let index = period; index < values.length; index++) {
    const gain = avgGain[index - 1],
      loss = avgLoss[index - 1];
    if (gain === null || loss === null) continue;
    output[index] = loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss);
  }
  return output;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastValues = ema(values, fast),
    slowValues = ema(values, slow);
  const line = values.map((_, index) =>
    fastValues[index] !== null && slowValues[index] !== null
      ? fastValues[index]! - slowValues[index]!
      : null,
  );
  const first = line.findIndex((value) => value !== null);
  const compact = first < 0 ? [] : (line.slice(first) as number[]);
  const compactSignal = ema(compact, signalPeriod);
  const signal: Array<number | null> = Array(values.length).fill(null);
  compactSignal.forEach((value, index) => {
    signal[first + index] = value;
  });
  return {
    line,
    signal,
    histogram: line.map((value, index) =>
      value !== null && signal[index] !== null ? value - signal[index]! : null,
    ),
  };
}

export function atrAdx(candles: Candle[], period = 14) {
  const tr = candles.map((candle, index) =>
    index === 0
      ? candle.high - candle.low
      : Math.max(
          candle.high - candle.low,
          Math.abs(candle.high - candles[index - 1].close),
          Math.abs(candle.low - candles[index - 1].close),
        ),
  );
  const plusDm = candles.map((candle, index) =>
    index === 0
      ? 0
      : Math.max(0, candle.high - candles[index - 1].high) >
          Math.max(0, candles[index - 1].low - candle.low)
        ? Math.max(0, candle.high - candles[index - 1].high)
        : 0,
  );
  const minusDm = candles.map((candle, index) =>
    index === 0
      ? 0
      : Math.max(0, candles[index - 1].low - candle.low) >
          Math.max(0, candle.high - candles[index - 1].high)
        ? Math.max(0, candles[index - 1].low - candle.low)
        : 0,
  );
  const atr = wilder(tr, period),
    plus = wilder(plusDm, period),
    minus = wilder(minusDm, period);
  const plusDi = atr.map((value, index) =>
    value && plus[index] !== null ? (100 * plus[index]!) / value : null,
  );
  const minusDi = atr.map((value, index) =>
    value && minus[index] !== null ? (100 * minus[index]!) / value : null,
  );
  const dx = plusDi.map((value, index) =>
    value !== null && minusDi[index] !== null && value + minusDi[index]! > 0
      ? (100 * Math.abs(value - minusDi[index]!)) / (value + minusDi[index]!)
      : null,
  );
  const first = dx.findIndex((value) => value !== null);
  const compact =
    first < 0 ? [] : dx.slice(first).filter((value): value is number => value !== null);
  const compactAdx = wilder(compact, period),
    adx: Array<number | null> = Array(candles.length).fill(null);
  compactAdx.forEach((value, index) => {
    adx[first + index] = value;
  });
  return { atr, plusDi, minusDi, adx };
}

export function indicators(candles: Candle[]) {
  const closed = candles.filter((candle) => candle.isClosed);
  const closes = closed.map((candle) => candle.close);
  const macdValues = macd(closes),
    directional = atrAdx(closed);
  return {
    closedBar: closed.at(-1)?.closeTime ?? null,
    ema20: lastTwo(ema(closes, 20), 20),
    ema50: lastTwo(ema(closes, 50), 50),
    ema200: lastTwo(ema(closes, 200), 200),
    rsi14: lastTwo(rsi(closes), 15),
    macd: {
      line: lastTwo(macdValues.line, 26),
      signal: lastTwo(macdValues.signal, 34),
      histogram: lastTwo(macdValues.histogram, 34),
      parameters: { fast: 12, slow: 26, signal: 9 },
    },
    atr14: lastTwo(directional.atr, 14),
    adx14: lastTwo(directional.adx, 27),
    plusDi14: lastTwo(directional.plusDi, 14),
    minusDi14: lastTwo(directional.minusDi, 14),
    parameters: {
      ema: [20, 50, 200],
      rsi: 14,
      atr: 14,
      adx: 14,
      smoothing: "Wilder",
      closedOnly: true,
    },
  };
}
