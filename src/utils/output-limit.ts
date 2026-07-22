type StructuredContent = Record<string, unknown>;

export function toolResult(data: StructuredContent, maxBytes: number) {
  const text = JSON.stringify(data);
  if (Buffer.byteLength(text) > maxBytes) throw new Error("Output limit exceeded");
  return { structuredContent: data, content: [{ type: "text" as const, text }] };
}
