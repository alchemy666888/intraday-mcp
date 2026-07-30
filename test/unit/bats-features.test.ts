import assert from "node:assert/strict";
import test from "node:test";
import type { Candle, CandleSeries } from "../../src/domain/market-data";
import { ema, indicators, rsi } from "../../src/features/indicators";
import { buildFeatures, confirmedPivots, sessionVwap } from "../../src/features/market-state";
import { validateCandles } from "../../src/market-history/validation";

const candles = (count: number, interval = 300_000): Candle[] =>
  Array.from({ length: count }, (_, index) => {
    const open = Date.UTC(2026, 0, 1) + index * interval;
    const close = 100 + index * 0.5 + Math.sin(index / 5);
    return {
      openTime: new Date(open).toISOString(),
      closeTime: new Date(open + interval - 1).toISOString(),
      open: close - 0.25,
      high: close + 1,
      low: close - 1,
      close,
      baseVolume: 10 + index,
      quoteVolume: close * (10 + index),
      tradeCount: index,
      isClosed: true,
    };
  });

test("EMA uses an SMA seed and is deterministic", () => {
  assert.deepEqual(ema([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
  assert.deepEqual(ema([1, 2, 3, 4, 5], 3), ema([1, 2, 3, 4, 5], 3));
});

test("Wilder RSI returns 100 for a consistently rising vector", () => {
  assert.equal(
    rsi(
      Array.from({ length: 30 }, (_, index) => index + 1),
      14,
    ).at(-1),
    100,
  );
});

test("indicators exclude open candles and enforce EMA200 warm-up", () => {
  assert.equal(indicators(candles(199)).ema200.warmupComplete, false);
  const input = candles(201);
  input.push({ ...input.at(-1)!, close: 1_000_000, isClosed: false });
  const result = indicators(input);
  assert.equal(result.ema200.warmupComplete, true);
  assert.notEqual(result.ema20.current, 1_000_000);
});

test("candle validation reports gaps, duplicates, ordering, and invalid OHLC", () => {
  const input = candles(4);
  input.splice(2, 1);
  input.push({ ...input[0] });
  input.push({
    ...input[1],
    openTime: new Date(Date.parse(input[1].openTime) - 1).toISOString(),
    high: 1,
  });
  const result = validateCandles(input, "5m");
  assert.equal(result.validation.gaps.length, 1);
  assert.equal(result.validation.duplicatesRemoved, 1);
  assert.equal(result.validation.invalidRemoved, 1);
  assert.equal(result.validation.outOfOrder, true);
});

test("session VWAP reports partial coverage when anchor precedes history", () => {
  const input = candles(5);
  const result = sessionVwap(input, new Date(Date.parse(input[0].openTime) - 300_000));
  assert.equal(result.completeFromAnchor, false);
  assert.ok(result.value !== null);
});

test("pivots are confirmed only after two right-side bars", () => {
  const input = candles(5).map((candle, index) => ({
    ...candle,
    high: [2, 3, 10, 4, 3][index],
    low: 1,
  }));
  assert.deepEqual(confirmedPivots(input).highs, [{ time: input[2].closeTime, price: 10 }]);
});

test("feature engine produces reproducible market state", () => {
  const intervals = {
    "5m": 300000,
    "15m": 900000,
    "1h": 3600000,
    "4h": 14400000,
    "1d": 86400000,
  } as const;
  const series = (Object.keys(intervals) as Array<keyof typeof intervals>).map((timeframe) => ({
    timeframe,
    candles: candles(300, intervals[timeframe]),
    venue: "fixture",
    marketType: "spot" as const,
    source: {} as CandleSeries["source"],
    validation: {
      valid: true,
      gaps: [],
      duplicatesRemoved: 0,
      invalidRemoved: 0,
      outOfOrder: false,
    },
  }));
  const asOf = new Date("2026-01-02T12:00:00Z");
  assert.deepEqual(buildFeatures(series, asOf), buildFeatures(series, asOf));
});
