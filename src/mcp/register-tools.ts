import { tools } from "@/tools/all";

type ToolRunner = (input: Record<string, unknown>) => Promise<unknown>;
type ToolConfig = {
  title: string;
  description: string;
  inputSchema: object;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
};
type ToolServer = {
  registerTool: (name: string, config: ToolConfig, run: ToolRunner) => unknown;
};

export function registerTools(server: ToolServer) {
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
