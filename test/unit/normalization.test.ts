import assert from "node:assert/strict";
import test from "node:test";
import { normalize } from "../../src/normalizers/snapshot.ts";

test("legacy upstream returns partial with unavailable enriched sections", () => {
  const snapshot = normalize({ timestamp: "2026-07-22T00:00:00.000Z", source: "hyperliquid", status: "success" }, { receivedAt: "2026-07-22T00:00:01.000Z", durationMs: 1, cacheStatus: "miss", upstreamStatus: 200 }, 120000);
  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.legacyContext?.source, "hyperliquid");
  assert.match(snapshot.warnings[0], /btcIntraday/);
});

test("perpetual derived fields are deterministic", () => {
  const snapshot = normalize({ timestamp: "2026-07-22T00:00:00.000Z", btcIntraday: { asOf: "2026-07-22T00:00:00.000Z", perpetual: { markPriceUsd: 100000, fundingRateHourly: "0.00001", openInterestBtc: 2 } } }, { receivedAt: "2026-07-22T00:00:01.000Z", durationMs: 1, cacheStatus: "miss", upstreamStatus: 200 }, 120000);
  assert.equal(snapshot.perpetual.fundingAprSimple, 0.0876);
  assert.equal(snapshot.perpetual.openInterestUsd, 200000);
});
