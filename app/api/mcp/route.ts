import { createMcpHandler } from "mcp-handler";

import { registerTools } from "@/mcp/register-tools";
import { authorize } from "@/security/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const inner = createMcpHandler(
  (server) => registerTools(server),
  {},
  { basePath: "/api", maxDuration: 15, verboseLogs: false },
);

async function handler(req: Request) {
  const auth = authorize(req);
  if (auth) return auth;
  return inner(req);
}

export { handler as DELETE, handler as GET, handler as POST };
