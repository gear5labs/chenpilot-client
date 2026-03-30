/**
 * Drop-in replacement for fetch() that routes Horizon RPC requests
 * through the backend's secure /proxy pipeline (GET /proxy).
 *
 * Usage: horizonFetch('/ledgers?order=desc&limit=1')
 *   → fetches /horizon/ledgers?order=desc&limit=1
 *   → Next.js rewrites to <backend>/proxy/ledgers?order=desc&limit=1
 */
const HORIZON_BASE = 'https://horizon.stellar.org';
const PROXY_BASE = '/horizon';

export function horizonFetch(urlOrPath: string, init?: RequestInit): Promise<Response> {
  const path = urlOrPath.startsWith(HORIZON_BASE)
    ? urlOrPath.slice(HORIZON_BASE.length)
    : urlOrPath;
  return fetch(`${PROXY_BASE}${path}`, init);
}
