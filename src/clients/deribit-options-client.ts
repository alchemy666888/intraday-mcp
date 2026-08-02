import { z } from "zod";
import { getEnv } from "@/config/env";
import { providerJson, type ProviderFetch } from "@/clients/provider-http";
import { dedupe, getCache, setCache } from "@/cache/ephemeral-cache";
/* eslint-disable @typescript-eslint/no-explicit-any -- cache writes follow schema validation */
const instrument = z.object({
  instrument_name: z.string(),
  expiration_timestamp: z.number(),
  strike: z.number(),
  option_type: z.enum(["call", "put"]),
});
const summary = z.object({
  instrument_name: z.string(),
  open_interest: z.number().optional(),
  mark_iv: z.number().optional(),
  underlying_price: z.number().optional(),
  mark_price: z.number().optional(),
});
const response = <T extends z.ZodTypeAny>(item: T) => z.object({ result: z.array(item) });
const tickerSchema = z.object({
  result: z.object({
    mark_iv: z.number().optional(),
    open_interest: z.number().optional(),
    greeks: z
      .object({
        delta: z.number().optional(),
        gamma: z.number().optional(),
        vega: z.number().optional(),
        theta: z.number().optional(),
      })
      .optional(),
  }),
});
export type DeribitOptionsInput = {
  maxExpiries: number;
  includeStrikes: boolean;
  maxStrikesPerExpiry: number;
  minimumOpenInterest: number;
};
export async function fetchDeribitOptions(
  input: DeribitOptionsInput,
  options: { fetch?: ProviderFetch; now?: () => number } = {},
) {
  const bounded = {
    maxExpiries: Math.min(6, Math.max(1, input.maxExpiries)),
    includeStrikes: input.includeStrikes,
    maxStrikesPerExpiry: Math.min(50, Math.max(0, input.maxStrikesPerExpiry)),
    minimumOpenInterest: Math.max(0, input.minimumOpenInterest),
  };
  const key = `deribit:${JSON.stringify(bounded)}`;
  const cached = getCache<any>(key);
  if (cached?.state === "fresh") return { ...cached.entry.payload, cacheStatus: "hit" };
  return dedupe(key, async () => {
    const base = "https://www.deribit.com/api/v2/public/";
    const call = (path: string) =>
      providerJson(base + path, {
        fetch: options.fetch,
        timeoutMs: getEnv().DIRECT_PROVIDER_TIMEOUT_MS,
      });
    const [ir, sr] = await Promise.all([
      call("get_instruments?currency=BTC&kind=option&expired=false"),
      call("get_book_summary_by_currency?currency=BTC&kind=option"),
    ]);
    const instruments = response(instrument).parse(ir).result,
      summaries = response(summary).parse(sr).result;
    const byName = new Map(summaries.map((s) => [s.instrument_name, s]));
    const expirations = [...new Set(instruments.map((i) => i.expiration_timestamp))]
      .sort((a, b) => a - b)
      .slice(0, bounded.maxExpiries);
    const expiries = await Promise.all(
      expirations.map(async (expirationTimestamp) => {
        const candidates = instruments.filter(
          (i) =>
            i.expiration_timestamp === expirationTimestamp &&
            Number(byName.get(i.instrument_name)?.open_interest ?? 0) >=
              bounded.minimumOpenInterest,
        );
        const underlying =
          candidates
            .map((i) => byName.get(i.instrument_name)?.underlying_price)
            .find((v): v is number => v !== undefined) ?? null;
        const sorted = [...candidates].sort(
          (a, b) =>
            Math.abs(a.strike - (underlying ?? a.strike)) -
            Math.abs(b.strike - (underlying ?? b.strike)),
        );
        const atmCall = sorted.find((i) => i.option_type === "call"),
          atmPut = sorted.find((i) => i.option_type === "put");
        const calls = candidates
            .filter((i) => i.option_type === "call")
            .sort((a, b) => a.strike - b.strike),
          puts = candidates
            .filter((i) => i.option_type === "put")
            .sort((a, b) => b.strike - a.strike);
        const selected = [
          atmCall,
          atmPut,
          calls[Math.floor(calls.length * 0.75)],
          puts[Math.floor(puts.length * 0.75)],
        ]
          .filter(
            (v, i, a): v is z.infer<typeof instrument> =>
              !!v && a.findIndex((x) => x?.instrument_name === v.instrument_name) === i,
          )
          .slice(0, 4);
        const tickers = await Promise.allSettled(
          selected.map(async (i) => ({
            instrument: i,
            data: tickerSchema.parse(
              await call(`ticker?instrument_name=${encodeURIComponent(i.instrument_name)}`),
            ).result,
          })),
        );
        const valid = tickers.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
          atmIvs = valid
            .filter((v) => v.instrument === atmCall || v.instrument === atmPut)
            .map((v) => v.data.mark_iv)
            .filter((v): v is number => v !== undefined);
        const call25 = valid.find((v) => v.instrument === selected[2])?.data.mark_iv ?? null,
          put25 = valid.find((v) => v.instrument === selected[3])?.data.mark_iv ?? null,
          atm = atmIvs.length ? atmIvs.reduce((a, b) => a + b, 0) / atmIvs.length : null;
        return {
          expiration: new Date(expirationTimestamp).toISOString().slice(0, 10),
          expirationTimestamp: new Date(expirationTimestamp).toISOString(),
          underlyingPriceUsd: underlying,
          atmStrikeUsd: atmCall?.strike ?? atmPut?.strike ?? null,
          atmIvPct: atm,
          call25DeltaIvPct: call25,
          put25DeltaIvPct: put25,
          riskReversal25dVolPoints: call25 !== null && put25 !== null ? call25 - put25 : null,
          butterfly25dVolPoints:
            call25 !== null && put25 !== null && atm !== null ? (call25 + put25) / 2 - atm : null,
          selectedInstruments: selected.map((i) => i.instrument_name),
          strikes: bounded.includeStrikes
            ? sorted
                .slice(0, bounded.maxStrikesPerExpiry)
                .sort((a, b) => a.strike - b.strike)
                .map((i) => ({ ...i, ...byName.get(i.instrument_name) }))
            : undefined,
          status: valid.length === selected.length ? "live" : "partial",
        };
      }),
    );
    const now = (options.now ?? Date.now)();
    const result = {
      source: "Deribit public REST",
      venue: "Deribit",
      marketType: "option",
      method: "bounded instruments, summaries, and selected tickers",
      sourceTimestamp: null,
      receivedAt: new Date(now).toISOString(),
      status: expiries.length ? "live" : "unavailable",
      cacheStatus: "miss",
      fallback: false,
      reason: expiries.length ? null : "no_expiries",
      warnings: [],
      expiries,
    };
    setCache(result, 200, 60_000, 840_000, key);
    return result;
  });
}
