import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../../src/normalizers/snapshot.ts";

type NormalizedTimeframes = Record<
  string,
  {
    status: string;
    reason: string | null;
    baseVolumeBtc: number | null;
    quoteVolumeUsd: number | null;
    vwapUsd: number | null;
    tradeCount: number | null;
    currentBar: Record<string, unknown>;
    closedBar: Record<string, unknown>;
  }
>;
const tframe = (snapshot: ReturnType<typeof normalize>) =>
  snapshot.timeframes as NormalizedTimeframes;

const meta = {
  receivedAt: "2026-07-22T00:00:01.000Z",
  durationMs: 1,
  cacheStatus: "miss" as const,
  upstreamStatus: 200,
};

test("legacy upstream returns partial with unavailable enriched sections", () => {
  const snapshot = normalize(
    { timestamp: "2026-07-22T00:00:00.000Z", source: "hyperliquid", status: "success" },
    meta,
    120000,
  );
  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.legacyContext?.source, "hyperliquid");
  assert.match(snapshot.warnings[0], /btcIntraday/);
});

test("perpetual derived fields are deterministic", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: {
        asOf: "2026-07-22T00:00:00.000Z",
        perpetual: {
          markPriceUsd: 100000,
          fundingRateHourly: "0.00001",
          openInterestBtc: 2,
        },
      },
    },
    meta,
    120000,
  );
  assert.equal(snapshot.perpetual.fundingAprSimple, 0.0876);
  assert.equal(snapshot.perpetual.openInterestUsd, 200000);
});

test("enriched upstream normalizes populated btcIntraday.timeframes", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: {
        asOf: "2026-07-22T00:00:00.000Z",
        timeframes: {
          "5m": {
            baseVolumeBtc: 10,
            quoteVolumeUsd: 1000000,
            tradeCount: 42,
            takerBuyBaseVolumeBtc: 6,
            takerBuyQuoteVolumeUsd: 600000,
            currentBar: { openTime: "2026-07-22T00:00:00.000Z" },
            closedBar: { closeTime: "2026-07-21T23:55:00.000Z" },
          },
          "15m": { baseVolume: 20, quoteVolume: 2100000, trades: 84 },
          "1h": { volumeBtc: 30, vwapUsd: 101000 },
        },
      },
    },
    meta,
    120000,
  );

  const timeframes = tframe(snapshot);

  assert.equal(timeframes["5m"].status, "fresh");
  assert.equal(timeframes["5m"].reason, null);
  assert.equal(timeframes["5m"].baseVolumeBtc, 10);
  assert.equal(timeframes["5m"].quoteVolumeUsd, 1000000);
  assert.equal(timeframes["5m"].vwapUsd, 100000);
  assert.equal(timeframes["5m"].tradeCount, 42);
  assert.deepEqual(timeframes["5m"].currentBar, {
    openTime: "2026-07-22T00:00:00.000Z",
  });
  assert.deepEqual(timeframes["5m"].closedBar, {
    closeTime: "2026-07-21T23:55:00.000Z",
  });
  assert.equal(timeframes["15m"].vwapUsd, 105000);
  assert.equal(timeframes["15m"].tradeCount, 84);
  assert.equal(timeframes["1h"].baseVolumeBtc, 30);
  assert.equal(timeframes["1h"].vwapUsd, 101000);
});

test("enriched upstream with missing btcIntraday.timeframes marks windows unavailable", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: { asOf: "2026-07-22T00:00:00.000Z", perpetual: {} },
    },
    meta,
    120000,
  );

  const timeframes = tframe(snapshot);

  for (const tf of ["5m", "15m", "1h"] as const) {
    assert.equal(timeframes[tf].status, "unavailable");
    assert.equal(timeframes[tf].reason, "upstream section missing");
    assert.equal(timeframes[tf].baseVolumeBtc, null);
    assert.equal(timeframes[tf].quoteVolumeUsd, null);
    assert.equal(timeframes[tf].vwapUsd, null);
  }
});

test("enriched upstream with empty btcIntraday.timeframes preserves upstream section missing reason", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: { asOf: "2026-07-22T00:00:00.000Z", timeframes: {} },
    },
    meta,
    120000,
  );

  const timeframes = tframe(snapshot);

  assert.equal(snapshot.status, "fresh");
  assert.equal(timeframes["5m"].reason, "upstream section missing");
  assert.equal(timeframes["15m"].reason, "upstream section missing");
  assert.equal(timeframes["1h"].reason, "upstream section missing");
});
