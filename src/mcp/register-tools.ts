import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "@/tools/all";

export function registerTools(server: McpServer) {
  for (const t of tools) {
    server.registerTool(
      t.name,
      {
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: true,
        },
      },
      t.run,
    );
  }
}
