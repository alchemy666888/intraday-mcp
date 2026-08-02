import { z } from "zod";
export const BinancePriceSchema = z.object({ symbol: z.string(), price: z.string() });
export const BinanceStatsSchema = z.object({
  symbol: z.string(),
  priceChangePercent: z.string(),
  highPrice: z.string(),
  lowPrice: z.string(),
  volume: z.string(),
  quoteVolume: z.string(),
  closeTime: z.number().optional(),
});
export const BinanceKlinesSchema = z.array(
  z
    .tuple([
      z.number(),
      z.string(),
      z.string(),
      z.string(),
      z.string(),
      z.string(),
      z.number(),
      z.string(),
      z.number(),
    ])
    .rest(z.unknown()),
);
