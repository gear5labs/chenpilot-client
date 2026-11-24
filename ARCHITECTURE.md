# Chenpilot Client Architecture

Welcome to the architectural documentation for **Chenpilot Client (`gear5labs/chenpilot-client`)**. This guide outlines the application's route tree, Redux state management, Axios networking layer, Socket.io real-time lifecycle, and a feature-placement decision guide.

---

## 1. Route Tree & Layout Chrome (`src/app`)

Chenpilot Client utilizes the Next.js App Router (`src/app/`) for file-system routing and layout encapsulation.

```text
src/app/
├── layout.tsx             # Root layout (Metadata, Viewport, Providers, PWA Service Worker)
├── page.tsx               # Landing / Entry redirect
├── globals.css            # Tailwind base, safe-area utilities, mobile scroll locks
├── auth/                  # Authentication routes (Login, Register, SSO Callback)
└── dashboard/             # Core authenticated workspace routes
    ├── layout.tsx         # Shared ChatLayout (Sidebar drawer, safe-area header, mobile responsiveness)
    ├── page.tsx           # Dashboard home / analytics overview
    └── chat/              # Real-time chat & collaboration interface
```

### Responsive Navigation & Drawer Specifications (#319)

- **Desktop (>= 1024px)**: `ChatLayout` displays a static sidebar alongside the main viewport. It supports collapsing to a compact icon-only rail (`w-16`) or expanding (`w-72`). The sidebar and main content flex alongside each other without overlap or horizontal overflow.
- **Mobile (< 1024px)**: The navigation sidebar collapses into an offscreen modal drawer (`-translate-x-full`), toggled via the mobile header menu button. When opened:
  - An accessible backdrop overlay covers the viewport (`z-40`).
  - The drawer slides into view (`translate-x-0`, `z-50`) constrained to `max-w-[85vw]`.
  - Body scrolling is locked via the `.sidebar-open` utility (`position: fixed; width: 100%; height: 100%`) in `src/app/globals.css`.
  - The drawer closes on overlay click, close button click, `Escape` keypress, or route navigation.
- **Narrow-Height & Virtual Keyboard**: In landscape or when on-screen virtual keyboards are active (e.g. height <= 400px), sidebar flex headers and profile footers use `shrink-0` while the conversation list scrolls independently via `flex-1 min-h-0 overflow-y-auto` to prevent occlusion or layout clipping.
- **Visual Regression Coverage**: End-to-end screenshot regression tests in `e2e/responsive-navigation.spec.ts` verify desktop, mobile, and keyboard-open states, asserting that no unexpected horizontal overflow (`scrollWidth > innerWidth`) or element occlusion occurs.
