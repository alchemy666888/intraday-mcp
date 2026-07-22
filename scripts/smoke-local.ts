const base = process.env.MCP_PUBLIC_BASE_URL ?? "http://localhost:3000";

for (const path of ["/api/healthz", "/api/readyz"]) {
  const response = await fetch(new URL(path, base));
  console.log(path, response.status, await response.text());
}

export {};
