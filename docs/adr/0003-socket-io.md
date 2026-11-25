# [ADR-0003] Real-time Communication using Socket.io Client

* **Status:** Accepted
* **Date:** 2026-10-07
* **Authors:** Chenpilot Engineering Team

## Context

The agent execution pipeline, user presence status, and interactive chat messaging require low-latency, bidirectional, real-time communication between the browser client and backend services.

## Decision

We adopt **Socket.io Client** (`socket.io-client`) for real-time bidirectional communication. The connection lifecycle and event routing are managed via a centralized singleton service (`socketManager`) and exposed through a React Context (`SocketProvider`) and custom hook (`useSocket`).

## Consequences

### Positive
- Automatic reconnection, heartbeat ping checks, and transport fallback mechanisms built into Socket.io.
- Decoupled real-time event handlers for agent streaming, presence updates, and execution traces.
- Easy integration with Redux store for real-time state synchronization.

### Negative / Trade-offs
- WebSockets require active connection management and cleanup on component unmount.
- Fallback polling overhead if WebSocket connections are blocked by strict corporate firewalls.

## Implementation Details & Code Links

This decision is implemented in:
- Socket Manager Service: [`src/services/socketManager.ts`](../../src/services/socketManager.ts)
- Socket Context Provider: [`src/components/providers/SocketProvider.tsx`](../../src/components/providers/SocketProvider.tsx)
- Custom Socket Hook: [`src/hooks/useSocket.ts`](../../src/hooks/useSocket.ts)
