import type { DirectSectionPlan } from "@/domain/market-data";
import { fetchBinanceSpot } from "@/clients/binance-spot-client";
import { fetchHyperliquidContext } from "@/clients/hyperliquid-context-client";
import { fetchCoinalyzeLiquidations } from "@/clients/coinalyze-liquidations-client";
import { fetchDeribitOptions } from "@/clients/deribit-options-client";
import type { ProviderFetch } from "@/clients/provider-http";
export async function fetchDirectMarketData(
  plan: DirectSectionPlan,
  options: { fetch?: ProviderFetch; now?: () => number } = {},
) {
  const now = (options.now ?? Date.now)();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  const jobs: Record<string, Promise<unknown>> = {};
  if (plan.spot) jobs.spot = fetchBinanceSpot(midnight.getTime(), options);
  if (plan.perpetual) jobs.perpetual = fetchHyperliquidContext(options);
  if (plan.liquidations) jobs.liquidations = fetchCoinalyzeLiquidations(options);
  if (plan.options)
    jobs.options = fetchDeribitOptions(
      plan.optionsInput ?? {
        maxExpiries: 3,
        includeStrikes: true,
        maxStrikesPerExpiry: 20,
        minimumOpenInterest: 0,
      },
      options,
    );
  const names = Object.keys(jobs),
    settled = await Promise.allSettled(Object.values(jobs));
  return Object.fromEntries(
    settled.map((result, index) => [
      names[index],
      result.status === "fulfilled"
        ? result.value
        : { status: "unavailable", reason: "provider_unavailable", warnings: [] },
    ]),
  );
}
