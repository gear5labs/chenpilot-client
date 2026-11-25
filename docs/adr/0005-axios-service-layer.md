# [ADR-0005] Axios Service Layer with Token Refresh and Retry Interceptors

* **Status:** Accepted
* **Date:** 2026-10-07
* **Authors:** Chenpilot Engineering Team

## Context

API communication with backend microservices requires centralized authorization header injection, request/response logging, automatic retry with exponential backoff on network failures, and seamless JWT token refresh handling without forcing user re-logins.

## Decision

We standardize on **Axios** (`axios`) wrapped in an `ApiService` class (`src/services/api.ts`). We configure a multi-tiered Axios interceptor pipeline handling:
1. Authorization header bearer token injection.
2. Transient error retries with exponential backoff and UI status notification.
3. Concurrent 401 token refresh queueing via `tokenRefreshService`.

## Consequences

### Positive
- Centralized request logic ensures consistent error handling, auth headers, and base URLs across all features.
- Transparent token refresh prevents request failures when access tokens expire during active user sessions.
- Built-in exponential backoff handles transient network instability gracefully.

### Negative / Trade-offs
- Complex interceptor chains require careful ordering to prevent infinite retry loops.
- Storage access (`localStorage`) must check `typeof window !== 'undefined'` for SSR safety.

## Implementation Details & Code Links

This decision is implemented in:
- Main API Service: [`src/services/api.ts`](../../src/services/api.ts)
- Token Refresh Service: [`src/services/tokenRefreshService.ts`](../../src/services/tokenRefreshService.ts)
- Retry Utility Helpers: [`src/utils/retryUtils.ts`](../../src/utils/retryUtils.ts)
