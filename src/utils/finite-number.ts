export function finite(value: unknown, opts: { allowNegative?: boolean } = {}): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  if (!opts.allowNegative && n < 0) return null;
  return n;
}
