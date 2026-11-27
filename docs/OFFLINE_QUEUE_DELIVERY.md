# Offline Queue Delivery States

## Why

A locally queued message is **not** proof that the server received it (#547). The client now distinguishes four states in `src/components/chat/OfflineQueueList.tsx`:

| State | Label | Meaning |
| --- | --- | --- |
| `queued` | "Queued — not sent to the server" | Still local only; server has not acknowledged it. |
| `sending` | "Sending — awaiting server acknowledgement" | A send is in flight. |
| `sent` | "Delivered — acknowledged by the server" | The service returned an acknowledgment. |
| `failed` | "Failed — not delivered" | The send failed and no acknowledgment exists. |

`src/utils/offlineQueueDisplay.ts` derives the state from the chat row's `metadata` via the shared `getDeliveryState()` helper. A queue entry with no matching user row (or with legacy metadata that cannot be interpreted) defaults to `queued`, never to `sent`. Agent rows are ignored. Only the `sent` state sets `acknowledged: true`.

## Mounting

`OfflineQueueList` is rendered from `Providers` so it is visible wherever the chat is used. It renders nothing when the queue is empty.

## Discarding one entry (#548)

Each row has a **Discard** button. It dispatches `dequeueMessage(id)` for the selected row only (#548); the reducer persists the remaining queue to localStorage, so unrelated queued work is preserved. Non-empty text (including whitespace-only content, which is treated as empty) is confirmed through `window.confirm` before removal via `confirmQueueRemoval()` in `src/utils/offlineQueueRemoval.ts`. Empty entries are removed directly. Declining confirmation leaves the queue untouched.

## Tests

- `src/utils/offlineQueueDisplay.test.ts` — state mapping and the no-early-delivery guarantee.
- `src/components/chat/OfflineQueueList.test.tsx` — all four states are visible, the unacknowledged row says "not sent", and discard is scoped/confirmed.
- `src/utils/offlineQueueRemoval.test.ts` — confirmation policy and single-item filtering.
