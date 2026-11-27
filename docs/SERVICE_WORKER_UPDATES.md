# Service Worker Update Prompt

## Behavior (#552)

`src/components/providers/ServiceWorkerUpdatePrompt.tsx` registers the production service worker and listens for `updatefound`. When the installing worker reaches `installed` while an older controller is active, it shows: **"A new version is ready."** with a **Refresh to update** button.

The client never reloads on its own:

1. `isTransactionActive()` blocks the refresh. The default predicate looks for `[data-active-wallet-transaction="true"]` in the DOM, so a wallet flow can mark itself as in-flight; the prompt shows "A wallet transaction is in progress. Refresh after it completes." and does nothing else.
2. `confirmReload()` (default `window.confirm`) must return true.
3. Only then does the client post `{ type: 'SKIP_WAITING' }` to the waiting worker and reload once. `public/service-worker.js` handles `SKIP_WAITING` with `self.skipWaiting()`. On a first-ever install there is no previous controller, so the worker activates immediately; subsequent updates wait for the confirmed refresh.

All collaborators are injectable props, so the policy is covered without a real service worker or browser reload.

## Mounting

`OfflineServiceWorker` renders the prompt in production from `src/app/layout.tsx`. No prompt is registered in development.

## Tests

`src/components/providers/ServiceWorkerUpdatePrompt.test.tsx` covers: no prompt before install, no reload before confirmation, transaction blocking, declined confirmation, and a single reload after confirmation.
