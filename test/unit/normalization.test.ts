import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../../src/normalizers/snapshot.ts";

const fetchMeta = {
  receivedAt: "2026-07-22T00:00:01.000Z",
  durationMs: 1,
  cacheStatus: "miss" as const,
  upstreamStatus: 200,
};

test("legacy upstream returns partial with unavailable enriched sections", () => {
  const snapshot = normalize(
    { timestamp: "2026-07-22T00:00:00.000Z", source: "hyperliquid", status: "success" },
    fetchMeta,
    120000,
  );
  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.quality.completeness, "legacy-only");
  assert.equal(snapshot.legacyContext?.source, "hyperliquid");
  assert.match(snapshot.warnings[0], /btcIntraday/);
});

test("btcIntraday without every enriched section reports partial-enriched completeness", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: {
        asOf: "2026-07-22T00:00:00.000Z",
        perpetual: { markPriceUsd: 100000 },
      },
    },
    fetchMeta,
    120000,
  );

  assert.equal(snapshot.status, "fresh");
  assert.equal(snapshot.quality.completeness, "partial-enriched");
  assert.equal(snapshot.timeframes["5m"].status, "missing");
  assert.equal(snapshot.perpetual.status, "fresh");
  assert.equal(snapshot.options.status, "missing");
});

test("btcIntraday with all enriched sections reports enriched completeness", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: {
        asOf: "2026-07-22T00:00:00.000Z",
        timeframes: { "5m": { baseVolumeBtc: 1, quoteVolumeUsd: 100000 } },
        perpetual: { markPriceUsd: 100000 },
        liquidations: { "5m": { longLiquidationUsd: 1, shortLiquidationUsd: 2 } },
        options: { expiries: [{ expiration: "2026-07-31", atmIvPct: 50 }] },
      },
    },
    fetchMeta,
    120000,
  );

  assert.equal(snapshot.quality.completeness, "enriched");
});

test("perpetual derived fields are deterministic", () => {
  const snapshot = normalize(
    {
      timestamp: "2026-07-22T00:00:00.000Z",
      btcIntraday: {
        asOf: "2026-07-22T00:00:00.000Z",
        perpetual: { markPriceUsd: 100000, fundingRateHourly: "0.00001", openInterestBtc: 2 },
      },
    },
    fetchMeta,
    120000,
  );
  assert.equal(snapshot.perpetual.fundingAprSimple, 0.0876);
  assert.equal(snapshot.perpetual.openInterestUsd, 200000);
});
