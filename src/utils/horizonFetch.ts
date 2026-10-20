/**
 * Drop-in replacement for fetch() that routes Horizon RPC requests
 * through the backend's secure /proxy pipeline (GET /proxy) with
 * consistent timeout and AbortController cancellation support (#330).
 */
const HORIZON_BASE = 'https://horizon.stellar.org';
const PROXY_BASE = '/horizon';
export const DEFAULT_HORIZON_TIMEOUT_MS = 15000;

export interface HorizonFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function horizonFetch(
  urlOrPath: string,
  init?: HorizonFetchOptions
): Promise<Response> {
  const path = urlOrPath.startsWith(HORIZON_BASE)
    ? urlOrPath.slice(HORIZON_BASE.length)
    : urlOrPath;
  const timeoutMs = init?.timeoutMs ?? DEFAULT_HORIZON_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = init?.signal;

  const onAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new Error(`Horizon request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const { timeoutMs: _omit, ...restInit } = init ?? {};
    return await fetch(`${PROXY_BASE}${path}`, {
      ...restInit,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onAbort);
    }
  }
}
