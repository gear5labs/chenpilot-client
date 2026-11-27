/**
 * Cache-version helpers for the ChenPilot service worker.
 *
 * Only caches owned by this app and carrying the ChenPilot static-cache
 * prefix are eligible for removal. Unrelated origin storage (other apps,
 * Workbox precaches, user data caches) is deliberately left untouched.
 */

export const CACHE_NAME = 'chenpilot-public-static-v1';
export const CACHE_PREFIX = 'chenpilot-public-static-';

/**
 * Return the ChenPilot-owned static caches that belong to an older release.
 * The current cache is always retained so allowlisted assets remain available
 * while the upgraded worker is taking control.
 */
export function obsoleteCacheNames(cacheNames, currentCacheName = CACHE_NAME) {
  if (!Array.isArray(cacheNames)) return [];

  return cacheNames.filter(
    (cacheName) =>
      typeof cacheName === 'string' &&
      cacheName.startsWith(CACHE_PREFIX) &&
      cacheName !== currentCacheName,
  );
}

/**
 * Delete only obsolete ChenPilot static caches through the supplied CacheStorage
 * API. Accepting the API as an argument keeps the activation cleanup testable
 * without a real service-worker global.
 */
export async function cleanupObsoleteCaches(cacheApi, cacheNames, currentCacheName = CACHE_NAME) {
  const obsolete = obsoleteCacheNames(cacheNames, currentCacheName);
  if (!cacheApi || typeof cacheApi.delete !== 'function') return obsolete;

  await Promise.all(obsolete.map((cacheName) => cacheApi.delete(cacheName)));
  return obsolete;
}
