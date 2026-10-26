# PWA Offline Strategy & Action Classification

## Overview
This document outlines the offline action classification, payment/signing action exclusions, and duplicate replay protection policies for ChenPilot Client.

## Offline Queue Strategy

## Restricted Offline Action Classification
- **Payment & Signing Actions**: Actions such as `send_payment`, `sign_transaction`, `transfer`, and `sign` are strictly excluded from offline queuing by default to prevent unsafe replays after connectivity returns.
- **Supported Actions**: Read operations, preference synchronization, and non-state-changing metadata updates are eligible for offline queuing.

## 2. Offline Caching Strategy
- **Explicit public-resource allowlist**: The production service worker caches only same-origin `GET` requests for `/_next/static/*` build assets and the exact public files listed in `public/offline-cache-policy.js` (the manifest, favicon, and named static images/SVGs). It does not cache HTML routes, image-optimization responses, arbitrary public paths, or cross-origin resources.
- **Sensitive response exclusion**: Auth, protected, account/wallet/balance, contact, and transaction paths are explicitly denied before cache eligibility. In practice, all non-allowlisted requests bypass Cache Storage, so new backend endpoints are not cacheable by default. Static responses marked `private` or `no-store` are also not persisted.
- **Tested patterns**: `src/app/offlineCachePolicy.test.ts` verifies allowed build/static resources, denies navigation and image optimization routes, and checks auth, balance, contact, and transaction endpoint patterns.
- The worker is registered only in production. It uses a cache-first strategy for allowlisted static resources; there is no API response cache or runtime fallback for authenticated HTML.

## 3. Browser Storage & Quota Handling
- Offline queue entries and voice-message chat history are persisted in `localStorage` for replay when the network is unavailable.
- All queued operations maintain unique identifiers (`id`) to prevent duplicate replays upon reconnection.
- When storage reaches quota, the client catches the quota exception, removes only expired offline data (older queued messages or stale chat history and expired voice entries), and retries the write.
- If the browser still refuses to persist the data, the UI surfaces a clear message stating that the offline content is unavailable rather than failing silently, including when a stored voice clip has been evicted or cannot be decoded by the browser.
