import { isCacheablePublicResource } from './offline-cache-policy.js';
import {
  CACHE_NAME,
  cleanupObsoleteCaches,
} from './service-worker-cache.js';

self.addEventListener('install', () => {
  // First install can activate immediately. An update waits for the user to
  // confirm the refresh prompt so no active wallet transaction is interrupted (#552).
  if (!self.registration.active) self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await cleanupObsoleteCaches(caches, cacheNames, CACHE_NAME);
      await self.clients.claim();
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheablePublicResource(request.url, request.method, self.location.origin)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(request);
      const cacheControl = response.headers.get('Cache-Control') || '';
      const isPublicResponse = response.type === 'basic' &&
        response.ok &&
        !/\b(?:private|no-store)\b/i.test(cacheControl);

      if (isPublicResponse) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.error('[ServiceWorker] Unable to cache public static resource:', error);
        }
      }

      return response;
    })(),
  );
});

// Let the client request immediate activation only after the user confirms the
// update prompt. The page reload closes the old client, so the waiting worker
// can take over without interrupting an in-flight wallet transaction (#552).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
