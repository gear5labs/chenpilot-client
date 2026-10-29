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
## 4. Offline action queue (#280)
Only operations that are safe to run later are queued while the device is offline. The queue is an allowlist (`QUEUEABLE_OFFLINE_ACTIONS` in `src/utils/offlineActions.ts`), so anything not listed is refused by default.

| Action kind | Queued offline? | Why |
| --- | --- | --- |
| `chat_message` | Yes | A plain chat query; replaying it sends the message the user typed. |
| `payment` | No | Replaying could move funds long after the user decided to. |
| `transaction_signing` | No | Signing must be an explicit, current user action. |
| `wallet_connection`, `contact_mutation`, `account_change` | No | Stateful or non-idempotent; retry while online. |

- `useOfflineQueue().queueMessageForSending(query, kind)` returns `null` and shows the reason for a refused kind; it never touches the queue.
- Queued items appear in `OfflineIndicator` ("N messages queued") and move queued → sending → sent in the chat list.
- Replay runs once per item: ids under replay are reserved, so a second trigger (for example the queue length changing while an item is still sending) cannot send it again. Items that fail are removed from the automatic queue and surface a retry action instead of being resent on their own.
- `useOfflineQueue().replayOutcome` reports `{ sent, failed, errors }` for the last replay, and the toast reflects it ("All N queued messages sent!", "X queued sent, Y failed", or the failure).
