# PWA Offline Caching & Installation Strategy

## Overview
This document outlines the Progressive Web App (PWA) configuration and caching behavior for **Chenpilot Client (`gear5labs/chenpilot-client`)**.

---

## 1. Manifest and Install Metadata
- **Manifest File**: Located at `/public/manifest.webmanifest`. Serves correct application name, standalone display mode, theme colors (`#0284c7`), and required icons (192px, 512px, and maskable variant).
- **iOS Support**: Apple-specific meta tags (`apple-mobile-web-app-capable`, status bar styling, and apple-touch-icon) are injected via `src/app/layout.tsx`.

---

## 2. Offline Caching Strategy
- **Explicit public-resource allowlist**: The production service worker caches only same-origin `GET` requests for `/_next/static/*` build assets and the exact public files listed in `public/offline-cache-policy.js` (the manifest, favicon, and named static images/SVGs). It does not cache HTML routes, image-optimization responses, arbitrary public paths, or cross-origin resources.
- **Sensitive response exclusion**: Auth, protected, account/wallet/balance, contact, and transaction paths are explicitly denied before cache eligibility. In practice, all non-allowlisted requests bypass Cache Storage, so new backend endpoints are not cacheable by default. Static responses marked `private` or `no-store` are also not persisted.
- **Tested patterns**: `src/app/offlineCachePolicy.test.ts` verifies allowed build/static resources, denies navigation and image optimization routes, and checks auth, balance, contact, and transaction endpoint patterns.
- The worker is registered only in production. It uses a cache-first strategy for allowlisted static resources; there is no API response cache or runtime fallback for authenticated HTML.

## 3. Browser Storage & Quota Handling
- Offline queue entries and voice-message chat history are persisted in `localStorage` for replay when the network is unavailable.
- When storage reaches quota, the client catches the quota exception, removes only expired offline data (older queued messages or stale chat history and expired voice entries), and retries the write.
- If the browser still refuses to persist the data, the UI surfaces a clear message stating that the offline content is unavailable rather than failing silently, including when a stored voice clip has been evicted or cannot be decoded by the browser.
## 4. Service worker verification (#283)
- **A service worker is registered.** `OfflineServiceWorker` (mounted in `src/app/layout.tsx`) registers the worker file as a module worker, and only when `NODE_ENV` is `production` and the browser supports service workers. In development no worker runs.
- **There is no Workbox.** The worker is the hand-written `public/service-worker.js`; the app does not use Workbox or any build-time service-worker generator, and this document makes no Workbox claims.
- **What it does.** Cache-first for the allowlist in `public/offline-cache-policy.js` into the `chenpilot-public-static-v1` cache, removal of older `chenpilot-public-static-*` caches on activate, and no interception of anything else (navigations, API calls, authenticated or wallet endpoints).
- **Offline smoke test.** `src/app/__tests__/serviceWorkerOffline.test.ts` evaluates the real worker script in a simulated worker scope and checks install/activate, that an allowlisted asset fetched once is served while the network is down, that sensitive and navigation requests are never cached, and that an uncached asset fails rather than being invented. It is not a real-browser test; a Playwright run against a production build would be the browser-level counterpart.
