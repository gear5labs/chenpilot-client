# [ADR-0002] Global State Management with Redux Toolkit

* **Status:** Accepted
* **Date:** 2026-10-07
* **Authors:** Chenpilot Engineering Team

## Context

Chenpilot client requires structured global state management across complex user interactions, including user authentication, real-time message ordering, active presence, retry banners, and account transaction tracking.

## Decision

We adopt **Redux Toolkit (RTK)** (`@reduxjs/toolkit`) for global client state management. State slices are modularized under `src/store/slices`, and store dispatching is lazy-injected into non-React service modules (like `apiService`) to decouple state updates from UI components while avoiding circular dependency issues.

## Consequences

### Positive
- Centralized, predictable state store with immutability guarantees provided by Immer under RTK `createSlice`.
- Type-safe hooks (`useAppDispatch`, `useAppSelector`) ensure full TypeScript type checking.
- Decoupled store injection pattern allows background services (`apiService`, retry handlers) to update UI state seamlessly.

### Negative / Trade-offs
- Slightly higher initial setup boilerplate compared to lightweight context options.
- Care needed to prevent circular imports between `src/store` and `src/services`.

## Implementation Details & Code Links

This decision is implemented in:
- Redux Store Setup: [`src/store/index.ts`](../../src/store/index.ts)
- Auth Slice: [`src/store/slices/authSlice.ts`](../../src/store/slices/authSlice.ts)
- Chat Slice: [`src/store/slices/chatSlice.ts`](../../src/store/slices/chatSlice.ts)
- UI & Retry Slice: [`src/store/slices/uiSlice.ts`](../../src/store/slices/uiSlice.ts)
