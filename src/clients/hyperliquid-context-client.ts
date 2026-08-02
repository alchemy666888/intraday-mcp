import { z } from "zod";
import { getEnv } from "@/config/env";
import { dedupe, getCache, setCache } from "@/cache/ephemeral-cache";
import { providerJson, type ProviderFetch } from "@/clients/provider-http";

const contextSchema = z.tuple([
  z.object({ universe: z.array(z.object({ name: z.string() })) }),
  z.array(
    z
      .object({
        markPx: z.string().optional(),
        oraclePx: z.string().optional(),
        funding: z.string().optional(),
        openInterest: z.string().optional(),
      })
      .passthrough(),
  ),
]);
const midsSchema = z.record(z.string());
const number = (value?: string) =>
  value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
export async function fetchHyperliquidContext(
  options: { fetch?: ProviderFetch; now?: () => number } = {},
) {
  const key = "hyperliquid:btc-context";
  const cached = getCache<Awaited<ReturnType<typeof collect>>>(key);
  if (cached?.state === "fresh") return { ...cached.entry.payload, cacheStatus: "hit" as const };
  return dedupe(key, async () => {
    const result = await collect(options);
    setCache(result, 200, 15_000, 105_000, key);
    return result;
  });
}
async function collect(options: { fetch?: ProviderFetch; now?: () => number }) {
  const receivedAt = new Date((options.now ?? Date.now)()).toISOString();
  const request = (type: string) =>
    providerJson("https://api.hyperliquid.xyz/info", {
      fetch: options.fetch,
      timeoutMs: getEnv().DIRECT_PROVIDER_TIMEOUT_MS,
      method: "POST",
      body: JSON.stringify({ type }),
      headers: { "content-type": "application/json" },
    });
  const [contextResult, midsResult] = await Promise.allSettled([
    request("metaAndAssetCtxs"),
    request("allMids"),
  ]);
  let markPriceUsd = null,
    oraclePriceUsd = null,
    fundingRateHourly = null,
    openInterestBtc = null,
    midPriceUsd = null;
  if (contextResult.status === "fulfilled") {
    const parsed = contextSchema.safeParse(contextResult.value);
    if (parsed.success) {
      const index = parsed.data[0].universe.findIndex((item) => item.name === "BTC");
      const value = parsed.data[1][index];
      markPriceUsd = number(value?.markPx);
      oraclePriceUsd = number(value?.oraclePx);
      fundingRateHourly = number(value?.funding);
      openInterestBtc = number(value?.openInterest);
    }
  }
  if (midsResult.status === "fulfilled") {
    const parsed = midsSchema.safeParse(midsResult.value);
    if (parsed.success) midPriceUsd = number(parsed.data.BTC);
  }
  const available = [
    markPriceUsd,
    oraclePriceUsd,
    fundingRateHourly,
    openInterestBtc,
    midPriceUsd,
  ].filter((v) => v !== null).length;
  return {
    source: "Hyperliquid public REST",
    venue: "Hyperliquid",
    marketType: "perpetual",
    method: "metaAndAssetCtxs + allMids",
    sourceTimestamp: null,
    receivedAt,
    observedAt: receivedAt,
    ageMs: 0,
    status: available === 5 ? "live" : available ? "partial" : "unavailable",
    cacheStatus: "miss" as const,
    fallback: false,
    reason: available ? null : "provider_unavailable",
    warnings: [],
    markPriceUsd,
    midPriceUsd,
    oraclePriceUsd,
    fundingRateHourly,
    fundingAprSimple: fundingRateHourly === null ? null : fundingRateHourly * 24 * 365,
    openInterestBtc,
    openInterestUsd:
      openInterestBtc === null || markPriceUsd === null ? null : openInterestBtc * markPriceUsd,
  };
}
