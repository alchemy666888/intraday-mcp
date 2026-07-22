type Entry<T>={payload:T;fetchedAt:string;expiresAt:number;staleUntil:number;upstreamStatus:number};
let entry: Entry<unknown>|null=null; const inflight = new Map<string, Promise<unknown>>();
export function getCache<T>(): {entry:Entry<T>; state:"fresh"|"stale"}|null { if(!entry) return null; const now=Date.now(); if(now<=entry.expiresAt) return {entry:entry as Entry<T>,state:"fresh"}; if(now<=entry.staleUntil) return {entry:entry as Entry<T>,state:"stale"}; return null; }
export function setCache<T>(payload:T, status:number, ttlMs:number, staleMs:number){ const now=Date.now(); entry={payload,fetchedAt:new Date(now).toISOString(),expiresAt:now+ttlMs,staleUntil:now+ttlMs+staleMs,upstreamStatus:status}; }
export async function dedupe<T>(key:string, fn:()=>Promise<T>):Promise<T>{ const existing=inflight.get(key); if(existing) return existing as Promise<T>; const p=fn().finally(()=>inflight.delete(key)); inflight.set(key,p); return p; }
export function cacheInfo(){return {hasCache:!!entry, fetchedAt:entry?.fetchedAt ?? null};}
