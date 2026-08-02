export const BATS_TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"] as const;
export type BatsTimeframe = (typeof BATS_TIMEFRAMES)[number];

export type Candle = {
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  baseVolume: number;
  quoteVolume: number | null;
  tradeCount: number | null;
  isClosed: boolean;
};

export type SourceRef = {
  provider: string;
  venue: string;
  instrument: string;
  marketType: "spot" | "perpetual";
  sourceTimestamp: string | null;
  receivedAt: string;
  ageMs: number | null;
  status: "live" | "stale" | "partial" | "unavailable" | "error";
  method: string;
  fallback: boolean;
  warnings: string[];
};

export type CandleSeries = {
  venue: string;
  marketType: "spot" | "perpetual";
  timeframe: BatsTimeframe;
  candles: Candle[];
  source: SourceRef;
  validation: {
    valid: boolean;
    gaps: Array<{ after: string; before: string; missingBars: number }>;
    duplicatesRemoved: number;
    invalidRemoved: number;
    outOfOrder: boolean;
  };
};

export const timeframeMs: Record<BatsTimeframe, number> = {
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
};

export type ProviderStatus = "live" | "stale" | "partial" | "unavailable" | "error";
export type ProviderCacheStatus = "miss" | "hit" | "stale-if-error" | "not-used";
export type ProviderEnvelope<T> = {
  data: T | null;
  source: string | null;
  venue: string;
  marketType: "spot" | "perpetual" | "option" | "aggregate";
  method: string;
  sourceTimestamp: string | null;
  observedAt: string;
  receivedAt: string;
  ageMs: number | null;
  status: ProviderStatus;
  cacheStatus: ProviderCacheStatus;
  fallback: boolean;
  reason: string | null;
  warnings: string[];
};
export type DirectSectionPlan = {
  spot: boolean;
  timeframes: boolean;
  perpetual: boolean;
  liquidations: boolean;
  options: boolean;
  sessionProfile: "UTC_DEFAULT" | "MYT_TRADING";
  maxAgeMs: number;
  optionsInput?: {
    maxExpiries: number;
    includeStrikes: boolean;
    maxStrikesPerExpiry: number;
    minimumOpenInterest: number;
  };
};
