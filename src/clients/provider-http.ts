export type ProviderFetch = typeof fetch;
export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = "ProviderError";
  }
}
type Options = {
  fetch?: ProviderFetch;
  timeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  headers?: HeadersInit;
  method?: string;
  body?: string;
};
export async function providerJson(url: string, options: Options = {}): Promise<unknown> {
  const fetcher = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const timeout = Math.min(4000, Math.max(500, options.timeoutMs ?? 4000));
  const deadline = now() + timeout;
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now();
    if (remaining <= 0) throw new ProviderError("timeout");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetcher(url, {
        method: options.method,
        body: options.body,
        headers: { accept: "application/json", ...options.headers },
        signal: controller.signal,
      });
      if (response.ok) return await response.json();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === 1)
        throw new ProviderError(`http_${response.status}`, response.status);
      let delay = 100;
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        delay = Number.isFinite(seconds)
          ? seconds * 1000
          : Math.max(0, Date.parse(retryAfter) - now());
      }
      if (delay >= deadline - now())
        throw new ProviderError(`http_${response.status}`, response.status);
      await sleep(delay);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      if (attempt === 1 || now() >= deadline)
        throw new ProviderError(
          error instanceof DOMException && error.name === "AbortError"
            ? "timeout"
            : "network_error",
        );
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ProviderError("network_error");
}
