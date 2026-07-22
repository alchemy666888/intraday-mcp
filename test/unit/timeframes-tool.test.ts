import assert from "node:assert/strict";
import test from "node:test";
import { filterTimeframesForRequest } from "../../src/tools/all.ts";

const snapshot = {
  timeframes: {
    "5m": {
      asOf: "2026-07-22T00:00:00.000Z",
      receivedAt: "2026-07-22T00:00:01.000Z",
      quality: "fresh",
      warnings: ["sample warning"],
      timeframe: "5m",
      currentBar: { volume: 1 },
      closedBar: { volume: 2 },
    },
    "15m": {
      asOf: "2026-07-22T00:00:00.000Z",
      receivedAt: "2026-07-22T00:00:01.000Z",
      quality: "fresh",
      warnings: [],
      timeframe: "15m",
      currentBar: { volume: 3 },
      closedBar: { volume: 4 },
    },
    "1h": {
      asOf: "2026-07-22T00:00:00.000Z",
      receivedAt: "2026-07-22T00:00:01.000Z",
      quality: "fresh",
      warnings: [],
      timeframe: "1h",
      currentBar: { volume: 5 },
      closedBar: { volume: 6 },
    },
  },
};

test("get_btc_timeframes filtering keeps only requested timeframes", () => {
  const filtered = filterTimeframesForRequest(snapshot, {
    timeframes: ["5m", "1h"],
    barSelection: "both",
  });

  assert.deepEqual(Object.keys(filtered), ["5m", "1h"]);
  assert.deepEqual(filtered["5m"], snapshot.timeframes["5m"]);
  assert.deepEqual(filtered["1h"], snapshot.timeframes["1h"]);
});

test("get_btc_timeframes current bar selection excludes closed bars and keeps metadata", () => {
  const filtered = filterTimeframesForRequest(snapshot, {
    timeframes: ["15m"],
    barSelection: "current",
  });
  const timeframe = filtered["15m"] as Record<string, unknown>;

  assert.deepEqual(timeframe.currentBar, { volume: 3 });
  assert.equal("closedBar" in timeframe, false);
  assert.equal(timeframe.asOf, "2026-07-22T00:00:00.000Z");
  assert.equal(timeframe.receivedAt, "2026-07-22T00:00:01.000Z");
  assert.equal(timeframe.quality, "fresh");
  assert.deepEqual(timeframe.warnings, []);
});

test("get_btc_timeframes closed bar selection excludes current bars", () => {
  const filtered = filterTimeframesForRequest(snapshot, {
    timeframes: ["5m"],
    barSelection: "closed",
  });
  const timeframe = filtered["5m"] as Record<string, unknown>;

  assert.deepEqual(timeframe.closedBar, { volume: 2 });
  assert.equal("currentBar" in timeframe, false);
});
