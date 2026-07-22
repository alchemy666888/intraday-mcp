import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchBinanceTimeframeFallback,
  mergeBinanceTimeframeFallback,
} from "../../src/clients/binance-timeframes-client";

const row = (openTime: number, closeTime: number) => [
  openTime,
  "100000",
  "101000",
  "99000",
  "100500",
  "10",
  closeTime,
  "1000000",
  42,
  "6",
  "600000",
  "0",
];

test("Binance timeframe fallback normalizes USD-M kline rows", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        row(Date.parse("2026-07-22T10:55:00.000Z"), Date.parse("2026-07-22T10:59:59.999Z")),
        row(Date.parse("2026-07-22T11:00:00.000Z"), Date.parse("2026-07-22T11:04:59.999Z")),
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );

  try {
    const fallback = await fetchBinanceTimeframeFallback(120000, "2026-07-22T11:01:00.000Z");

    assert.deepEqual(fallback.diagnostics, []);
    const fiveMinute = fallback.timeframes["5m"] as Record<string, unknown>;
    assert.equal(fiveMinute.status, "live");
    assert.equal(fiveMinute.reason, null);
    assert.equal(fiveMinute.baseVolumeBtc, 10);
    assert.equal(fiveMinute.quoteVolumeUsd, 1000000);
    assert.equal(fiveMinute.vwapUsd, 100000);
    assert.equal(fiveMinute.tradeCount, 42);
    assert.deepEqual(Object.keys(fiveMinute.currentBar as object), [
      "openTime",
      "closeTime",
      "openUsd",
      "highUsd",
      "lowUsd",
      "closeUsd",
      "baseVolumeBtc",
      "quoteVolumeUsd",
      "vwapUsd",
      "tradeCount",
      "takerBuyBaseVolumeBtc",
      "takerBuyQuoteVolumeUsd",
    ]);
    assert.equal(
      (fiveMinute.closedBar as Record<string, unknown>).closeTime,
      "2026-07-22T10:59:59.999Z",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Binance fallback diagnostics replace generic upstream missing reason", () => {
  const snapshot = {
    timeframes: {
      "5m": { status: "unavailable", reason: "upstream section missing", warnings: [] },
      "15m": { status: "unavailable", reason: "upstream section missing", warnings: [] },
      "1h": { status: "unavailable", reason: "upstream section missing", warnings: [] },
    },
    quality: { warnings: [] },
    warnings: [],
  };

  const merged = mergeBinanceTimeframeFallback(snapshot, {
    timeframes: {},
    diagnostics: [
      "5m fapi.binance.com HTTP 451: Service unavailable from a restricted location",
      "5m data-api.binance.vision HTTP 404: Not Found",
    ],
  });
  const timeframes = merged.timeframes as Record<string, Record<string, unknown>>;

  assert.equal(
    timeframes["5m"].reason,
    "Binance USD-M klines unavailable from upstream and direct fallback",
  );
  assert.match(String(timeframes["5m"].warnings), /HTTP 451/);
  assert.match(String(merged.quality.warnings), /data-api\.binance\.vision HTTP 404/);
});
