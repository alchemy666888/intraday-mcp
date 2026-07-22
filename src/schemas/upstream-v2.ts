import { z } from "zod";
export const UpstreamAnySchema = z.object({ schemaVersion:z.string().optional(), timestamp:z.string().optional(), interval:z.string().optional(), source:z.string().optional(), prices:z.unknown().optional(), assets:z.unknown().optional(), btcIntraday:z.unknown().optional(), status:z.string().optional(), persistence:z.unknown().optional(), alerts:z.unknown().optional() }).passthrough();
export type UpstreamAny = z.infer<typeof UpstreamAnySchema>;
