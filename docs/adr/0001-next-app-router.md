# [ADR-0001] Adoption of Next.js App Router

* **Status:** Accepted
* **Date:** 2026-10-07
* **Authors:** Chenpilot Engineering Team

## Context

The Chenpilot client application requires a modern React framework supporting server-side rendering (SSR), layout nesting, streaming, and efficient route management for interactive Web3 AI workspace features.

## Decision

We adopt the **Next.js App Router** architecture using Next.js 15+. All page routes and global layouts are placed under the `src/app` directory utilizing React Server Components (RSC) and Client Components (`'use client'`) where stateful interactivity or browser APIs are required.

## Consequences

### Positive
- Nested layouts (`layout.tsx`) prevent unnecessary page re-renders across chat and dashboard route transitions.
- Integrated Server Components enable optimized asset loading and SEO for public pages.
- Built-in support for Next.js middleware and API routes simplifies edge processing and headers.

### Negative / Trade-offs
- Requires explicit `'use client'` directives on interactive components (Redux providers, Socket hooks).
- Hydration boundaries must be managed carefully to avoid client-server markup mismatches.

## Implementation Details & Code Links

This architecture is implemented in the following code locations:
- App Layout: [`src/app/layout.tsx`](../../src/app/layout.tsx)
- Root Page Component: [`src/app/page.tsx`](../../src/app/page.tsx)
- Global Providers: [`src/components/providers/Providers.tsx`](../../src/components/providers/Providers.tsx)
