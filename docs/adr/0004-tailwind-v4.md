# [ADR-0004] Styling and Design System via Tailwind CSS v4

* **Status:** Accepted
* **Date:** 2026-10-07
* **Authors:** Chenpilot Engineering Team

## Context

The Chenpilot interface needs a modern, responsive, dark-mode ready UI component architecture with minimal bundle overhead and high developer velocity.

## Decision

We adopt **Tailwind CSS v4** (`@tailwindcss/postcss` v4) for utility-first styling. We pair Tailwind v4 with `clsx` and `tailwind-merge` (`cn` helper) to facilitate dynamic class composition in reusable UI components.

## Consequences

### Positive
- High styling velocity with standardized design tokens for colors, spacing, typography, and dark mode.
- Improved build speeds and smaller CSS bundles with Tailwind v4's CSS-first engine.
- Conflict-free dynamic class merging using `cn(...)` utility (`tailwind-merge`).

### Negative / Trade-offs
- Utility class strings in JSX can become lengthy without proper component abstraction.
- Tailwind v4 post-processing setup must remain aligned with Next.js PostCSS configuration.

## Implementation Details & Code Links

This decision is implemented in:
- Global Styles & Import Rules: [`src/app/globals.css`](../../src/app/globals.css)
- Class Name Utility (`cn`): [`src/utils/cn.ts`](../../src/utils/cn.ts)
- PostCSS Configuration: [`postcss.config.mjs`](../../postcss.config.mjs)
