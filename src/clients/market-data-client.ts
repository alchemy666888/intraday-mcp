import { getEnv, upstreamUrl } from "@/config/env";
import { getCache, setCache, dedupe } from "@/cache/ephemeral-cache";
import { UpstreamAnySchema, type UpstreamAny } from "@/schemas/upstream-v2";
import { UpstreamHttpError, UpstreamSchemaError, UpstreamTimeoutError } from "@/utils/errors";
export type FetchMeta={receivedAt:string; durationMs:number; cacheStatus:"hit"|"miss"|"stale-if-error"; upstreamStatus:number|null};
const retryStatuses=[429,502,503,504];
export async function fetchMarketData(maxAgeMs?:number):Promise<{payload:UpstreamAny;meta:FetchMeta}>{
 const env=getEnv(); const cached=getCache<UpstreamAny>(); if(cached?.state==="fresh") return {payload:cached.entry.payload, meta:{receivedAt:new Date().toISOString(),durationMs:0,cacheStatus:"hit",upstreamStatus:cached.entry.upstreamStatus}};
 return dedupe("upstream", async()=>{ const start=Date.now(); let last:unknown; for(let i=0;i<=env.UPSTREAM_MAX_RETRIES;i++){ const ac=new AbortController(); const t=setTimeout(()=>ac.abort(), Math.min(env.UPSTREAM_TIMEOUT_MS, maxAgeMs ?? env.UPSTREAM_TIMEOUT_MS)); try{ const res=await fetch(upstreamUrl(env),{signal:ac.signal,headers:{accept:"application/json"}}); clearTimeout(t); if(!res.ok){ if(i<env.UPSTREAM_MAX_RETRIES && retryStatuses.includes(res.status)) continue; throw new UpstreamHttpError(res.status); } const json=await res.json(); const parsed=UpstreamAnySchema.safeParse(json); if(!parsed.success) throw new UpstreamSchemaError(); setCache(parsed.data,res.status,env.UPSTREAM_CACHE_TTL_MS,env.UPSTREAM_STALE_IF_ERROR_MS); return {payload:parsed.data,meta:{receivedAt:new Date().toISOString(),durationMs:Date.now()-start,cacheStatus:"miss" as const,upstreamStatus:res.status}}; } catch(e){ clearTimeout(t); last=e; if(i>=env.UPSTREAM_MAX_RETRIES) break; } }
 const stale=getCache<UpstreamAny>(); if(stale?.state==="stale") return {payload:stale.entry.payload,meta:{receivedAt:new Date().toISOString(),durationMs:Date.now()-start,cacheStatus:"stale-if-error",upstreamStatus:stale.entry.upstreamStatus}}; if(last instanceof DOMException && last.name==="AbortError") throw new UpstreamTimeoutError(); throw last; }) as Promise<{payload:UpstreamAny;meta:FetchMeta}>;
}
