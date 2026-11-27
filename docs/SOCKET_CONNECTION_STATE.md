# Socket connection state

Real-time socket status is modelled once, in `src/types/socket.ts`, and every
consumer reads that single `SocketConnectionState` union (#279).

| State          | Meaning                                                                 | User-visible                         |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `idle`         | Unknown initial state: no connection has been attempted yet             | nothing                              |
| `connecting`   | Initial connect or a manual retry is in flight                          | "Connecting to live updates…"        |
| `connected`    | The socket is open                                                      | nothing                              |
| `reconnecting` | The connection was lost and automatic retries are running               | "Reconnecting … (attempt n of m)"    |
| `exhausted`    | Failed: every automatic retry was used; only a manual `retry()` helps   | "Live updates unavailable" + Retry   |
| `disconnected` | Closed on purpose (client call or server kick); no retries are queued   | "Live updates disconnected" + Retry  |

- `SocketManager` owns the transitions and starts in `idle`.
- `SocketProvider` subscribes with `onStateChange` and exposes `connectionState`.
  `isConnected` is derived from it (`isSocketConnected`) and is not tracked separately.
- `OfflineIndicator` renders the status line for the visible states
  (`isSocketStatusVisible`). It reads the provider through `useOptionalSocket`, so it
  still renders where no `SocketProvider` is mounted. A browser that is offline always
  shows the offline message first.

## Manual reconnect control (#286)

When automatic retries are `exhausted` or the socket is `disconnected`, `OfflineIndicator` exposes an in-place **Retry** button that triggers `SocketProvider.retry()` without reloading the page or changing the active route/URL state.

- **Concurrency guard:** `SocketProvider.retry()`, `SocketManager.retry()`, and `OfflineIndicator` all ignore concurrent reconnect calls while a retry is already in flight or while the socket is `connecting`, `reconnecting`, or `connected`. The Retry button displays `Reconnecting…` and is disabled while in flight.
- **Result announcement:** `SocketProvider` exposes `isRetrying` and `lastRetryResult` (`'succeeded' | 'failed' | null`). `OfflineIndicator` renders inside a `role="status" aria-live="polite"` live region and announces `Live updates reconnected` (auto-dismissed after 5s) on success, or `Reconnect failed • live updates unavailable` / `Reconnect failed • live updates disconnected` on failure with Retry re-enabled.
- **Backend contract:** No new backend endpoint is required; manual reconnect reuses the standard Socket.IO handshake via `socket.connect()`.

Tests: `src/types/socket.test.ts` (model and initial state),
`src/components/providers/SocketProvider.test.tsx` (transitions, manual retry guards, and listener
cleanup on unmount), `src/services/__tests__/socketManager.test.ts` (state
machine and handler registration), and
`src/components/chat/OfflineIndicator.socket.test.tsx` (status UI, concurrency, announcements, and route preservation).

## Event payload version compatibility (#538)

Real-time payloads use the envelope `{ version, event, data }`. The current supported version is **v1**; it is published as `SOCKET_EVENT_VERSION` and `SUPPORTED_SOCKET_EVENT_VERSIONS` in `src/services/socketEventVersion.ts`.

| Payload | Behavior |
| ------- | -------- |
| `version` is a supported integer | Accepted and handed to state-updating listeners. |
| No `version` field | Treated as legacy v1 for backwards compatibility. |
| Unknown integer version | **Dropped**. The client does not guess at a newer schema. |
| Malformed version (string, fraction, non-object payload) | **Dropped** as invalid. |

`classifySocketEventVersion()` returns only version metadata and a reason string; it never echoes payload content into diagnostics. Unknown-version events are ignored rather than applied, so an older client cannot corrupt chat or presence state with data it cannot interpret. Contract tests: `src/services/__tests__/socketEventVersion.test.ts`.

## Offline reconnect gating (#539)

Socket.io retries on its own even without network connectivity. `src/services/socketConnectivity.ts` provides `SocketReconnectGate`, which `SocketProvider` uses to:

- pause attempts on an `offline` transition (clearing any queued resume), and
- resume with **at most one** attempt on the next `online` transition.

Repeated `online` events while already online do not stack attempts, and a queued attempt is cancelled if the browser goes offline again before it is taken. `connectivityAction(wasOnline, isOnline)` documents the three allowed outcomes (`pause`, `resume-once`, `none`). Contract tests: `src/services/__tests__/socketConnectivity.test.ts` and `src/components/providers/SocketProvider.connectivity.test.tsx`.
