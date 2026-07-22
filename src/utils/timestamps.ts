export const isoNow = () => new Date().toISOString();
export function validIso(value: unknown): string | null { if (typeof value !== "string") return null; const t=Date.parse(value); return Number.isFinite(t) ? new Date(t).toISOString() : null; }
export function ageMs(asOf: string | null, receivedAt: string): number | null { return asOf ? Date.parse(receivedAt)-Date.parse(asOf) : null; }
export function statusFor(age: number | null, maxAgeMs: number, present=true): "live"|"stale"|"partial"|"unavailable"|"error" { if(!present) return "unavailable"; if(age===null) return "partial"; return age > maxAgeMs ? "stale" : "live"; }
