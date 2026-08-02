export type CacheState = "fresh" | "stale";
export type CacheEntry<T> = {
  payload: T;
  fetchedAt: string;
  expiresAt: number;
  staleUntil: number;
  upstreamStatus: number;
  lastAccessed: number;
};

const MAX_ENTRIES = 64;
const entries = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
let clock: () => number = Date.now;

export function getCache<T>(key = "upstream"): { entry: CacheEntry<T>; state: CacheState } | null {
  const entry = entries.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = clock();
  if (now > entry.staleUntil) {
    entries.delete(key);
    return null;
  }
  entry.lastAccessed = now;
  return { entry, state: now <= entry.expiresAt ? "fresh" : "stale" };
}

export function setCache<T>(
  payload: T,
  status: number,
  ttlMs: number,
  staleMs: number,
  key = "upstream",
) {
  const now = clock();
  for (const [candidate, entry] of entries) if (entry.staleUntil < now) entries.delete(candidate);
  if (!entries.has(key) && entries.size >= MAX_ENTRIES) {
    const oldest = [...entries].sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0];
    if (oldest) entries.delete(oldest[0]);
  }
  entries.set(key, {
    payload,
    fetchedAt: new Date(now).toISOString(),
    expiresAt: now + ttlMs,
    staleUntil: now + ttlMs + staleMs,
    upstreamStatus: status,
    lastAccessed: now,
  });
}

export async function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fn().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function cacheInfo() {
  const newest = [...entries.values()].sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
  return {
    hasCache: entries.size > 0,
    fetchedAt: newest?.fetchedAt ?? null,
    entryCount: entries.size,
    inflightCount: inflight.size,
  };
}

export function resetEphemeralCache() {
  entries.clear();
  inflight.clear();
}

export function setCacheClockForTests(value?: () => number) {
  clock = value ?? Date.now;
}
