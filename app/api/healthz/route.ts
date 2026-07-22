import { SERVICE, VERSION } from "@/config/env";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export function GET(){ return Response.json({status:"ok",service:SERVICE,version:VERSION,platform:"vercel"},{headers:{"cache-control":"no-store"}}); }
