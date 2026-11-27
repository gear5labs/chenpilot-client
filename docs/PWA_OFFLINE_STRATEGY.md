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
- `getCacheAllowlistSummary()` in `public/offline-cache-policy.js` exposes the same prefix, named files and sensitive-path patterns the worker enforces. The `/offline` guidance page reads that summary instead of keeping a second list, so the two cannot drift.

---

## 2a. Offline Guidance Route (#553)

`src/app/offline/page.tsx` is the destination for protected pages that cannot load without connectivity (linked from the offline banner in `OfflineIndicator`).

- **What it says**: exactly the allowlisted resources — previously downloaded bundles under `/_next/static/` and the named public files — plus an explicit list of what is never cached (sign-in, protected pages, account settings, wallet details, balances, contacts and transactions). It also separates queued messages held on the device from cached server data.
- **Safe retry**: `?next=` is validated by `getSafeRetryPath()` (`src/components/offline/offlineGuidanceCopy.ts`) before it reaches the client. Only same-origin internal paths are accepted; protocol-relative URLs, `\\`, control characters, `/api/*`, `/offline` and over-long values fall back to `/dashboard`.
- **Connectivity gating**: the button starts disabled, enables on the browser `online` event, and disables again on `offline`. Clicking re-checks `navigator.onLine` before a GET navigation and `router.refresh()`; no POST, payment or queued mutation is replayed.
- **Tests**: `src/app/offlineCachePolicy.test.ts` (summary matches enforcement), `src/components/offline/offlineGuidanceCopy.test.ts` (copy derived from policy, retry target validation), `src/components/offline/OfflineGuidance.test.tsx` (connectivity gating), `src/app/offline/page.test.tsx` (server-side validation), and `src/components/chat/OfflineIndicator.socket.test.tsx` (guidance link).

## 3. Browser Storage & Quota Handling
- Offline queue entries and voice-message chat history are persisted in `localStorage` for replay when the network is unavailable.
- When storage reaches quota, the client catches the quota exception, removes only expired offline data (older queued messages or stale chat history and expired voice entries), and retries the write.
- If the browser still refuses to persist the data, the UI surfaces a clear message stating that the offline content is unavailable rather than failing silently, including when a stored voice clip has been evicted or cannot be decoded by the browser.
- Persisted queue entries are owner-scoped: the hook records the authenticated user id when queueing and refuses to replay the global `messageQueue` unless every entry belongs to the current user. Legacy rows with no recorded owner, and all rows after a sign-out or account switch, are removed with a clear notice instead of being sent under the wrong account (`src/hooks/offlineQueueOwnership.ts`).