import { fetchDirectMarketData } from "@/services/direct-market-data-service";
export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    console.log(
      "Usage: npm run smoke:providers -- [--help]\nOpt-in live REST checks for Binance, Hyperliquid, Deribit, and configured Coinalyze.",
    );
    return 0;
  }
  const result = await fetchDirectMarketData({
    spot: true,
    timeframes: false,
    perpetual: true,
    liquidations: true,
    options: true,
    sessionProfile: "UTC_DEFAULT",
    maxAgeMs: 120000,
  });
  for (const [provider, value] of Object.entries(result)) {
    const safe = value as Record<string, unknown>;
    console.log(
      JSON.stringify({
        provider,
        status: safe.status ?? "unavailable",
        freshness: safe.ageMs ?? null,
        coverage: safe.includedSymbols ?? null,
        reason: safe.reason ?? null,
      }),
    );
  }
  return 0;
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().then((code) => {
    process.exitCode = code;
  });
