'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store';
import { setOnlineStatus, loadMessageQueue, fetchChatHistory } from '@/store/slices/chatSlice';
import { WifiOff, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  useOptionalSocket,
  type ManualReconnectResult,
} from '@/components/providers/SocketProvider';
import {
  INITIAL_SOCKET_CONNECTION_STATE,
  isSocketStatusVisible,
  type SocketConnectionState,
} from '@/types/socket';

/** Status-line copy for each visible socket state (#279). */
export function describeSocketState(
  state: SocketConnectionState,
  attempt = 0,
  maxAttempts = 0,
): string | null {
  switch (state) {
    case 'connecting':
      return 'Connecting to live updates…';
    case 'reconnecting':
      return maxAttempts > 0 && attempt > 0
        ? `Reconnecting to live updates (attempt ${attempt} of ${maxAttempts})…`
        : 'Reconnecting to live updates…';
    case 'exhausted':
      return 'Live updates unavailable • could not reconnect';
    case 'disconnected':
      return 'Live updates disconnected';
    default:
      return null;
  }
}

/** "last synced …" copy for cached conversations (#289). */
export function describeLastSynced(lastSyncedAt: string | null, now: Date = new Date()): string {
  if (!lastSyncedAt) return 'not synced yet';
  const then = new Date(lastSyncedAt);
  if (Number.isNaN(then.getTime())) return 'not synced yet';
  const sameDay = then.toDateString() === now.toDateString();
  const time = then.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `last synced ${time}` : `last synced ${then.toLocaleDateString()} ${time}`;
}

interface OfflineIndicatorProps {
  canRetry?: boolean;
  onRetry?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  canRetry = false,
  onRetry,
}) => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue, dataSource, lastSyncedAt } = useAppSelector((state) => state.chat);
  const [connectionRestored, setConnectionRestored] = useState(false);
  const [manualRetryPending, setManualRetryPending] = useState(false);
  const [retryResult, setRetryResult] = useState<ManualReconnectResult | null>(null);

  const manualRetryPendingRef = useRef(false);
  const prevSocketStateRef = useRef<SocketConnectionState>(INITIAL_SOCKET_CONNECTION_STATE);

  const socket = useOptionalSocket();
  // `idle` is the documented initial state; there is no 'unknown' member (#553).
  const socketState: SocketConnectionState =
    socket?.connectionState ?? INITIAL_SOCKET_CONNECTION_STATE;
  const socketIsRetrying = Boolean(socket?.isRetrying) || manualRetryPending;
  const socketMessage = isSocketStatusVisible(socketState)
    ? describeSocketState(socketState, socket?.reconnectAttempt, socket?.maxReconnectAttempts)
    : null;
  const canRetrySocket =
    socket !== undefined && (socketState === 'exhausted' || socketState === 'disconnected');

  useEffect(() => {
    // Load queue on mount
    dispatch(loadMessageQueue());
    dispatch(setOnlineStatus(navigator.onLine));

    // Set up event listeners
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
      setConnectionRestored(true);
      // Reconcile cached messages with the server; the merge is by message id, so no duplicates (#289)
      dispatch(fetchChatHistory());
    };

    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
      setConnectionRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!connectionRestored || canRetry || messageQueue.length > 0) return;

    const timeout = window.setTimeout(() => setConnectionRestored(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [canRetry, connectionRestored, messageQueue.length]);

  // Track manual reconnect outcome and announce result (#286)
  useEffect(() => {
    const prevState = prevSocketStateRef.current;

    if (manualRetryPendingRef.current) {
      if (socketState === 'connected' || socket?.lastRetryResult === 'succeeded') {
        manualRetryPendingRef.current = false;
        setManualRetryPending(false);
        setRetryResult('succeeded');
      } else if (
        (prevState === 'connecting' || prevState === 'reconnecting') &&
        (socketState === 'exhausted' || socketState === 'disconnected')
      ) {
        manualRetryPendingRef.current = false;
        setManualRetryPending(false);
        setRetryResult('failed');
      } else if (socket?.lastRetryResult === 'failed' && !socket?.isRetrying) {
        manualRetryPendingRef.current = false;
        setManualRetryPending(false);
        setRetryResult('failed');
      }
    } else if (socketState === 'connected' && retryResult === 'failed') {
      setRetryResult(null);
    }

    prevSocketStateRef.current = socketState;
  }, [socketState, socket?.lastRetryResult, socket?.isRetrying, retryResult]);

  // Auto-dismiss the manual reconnect success announcement
  useEffect(() => {
    if (retryResult !== 'succeeded') return;

    const timeout = window.setTimeout(() => setRetryResult(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [retryResult]);

  const handleSocketRetry = useCallback(() => {
    if (!socket) return;
    if (
      manualRetryPendingRef.current ||
      socket.isRetrying ||
      socketState === 'connecting' ||
      socketState === 'reconnecting' ||
      socketState === 'connected'
    ) {
      return;
    }

    manualRetryPendingRef.current = true;
    setManualRetryPending(true);
    setRetryResult(null);
    socket.retry();
  }, [socket, socketState]);

  const socketAnnouncement =
    retryResult === 'succeeded'
      ? 'Live updates reconnected'
      : retryResult === 'failed' && canRetrySocket
        ? socketState === 'disconnected'
          ? 'Reconnect failed • live updates disconnected'
          : 'Reconnect failed • live updates unavailable'
        : socketMessage;

  if (isOnline && messageQueue.length === 0 && !connectionRestored && !socketAnnouncement) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium z-40 transition-all duration-300 ${
        isOnline
          ? 'bg-blue-900/80 border border-blue-700 text-blue-200'
          : 'bg-red-900/80 border border-red-700 text-red-200 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>
            {messageQueue.length > 0
              ? `Online • ${messageQueue.length} message${messageQueue.length !== 1 ? 's' : ''} queued`
              : canRetry
                ? 'Connection restored • your changes are ready to retry'
                : connectionRestored
                  ? 'Connection restored'
                  : socketAnnouncement}
          </span>
          {canRetrySocket && !connectionRestored && messageQueue.length === 0 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={socketIsRetrying}
              onClick={handleSocketRetry}
            >
              {socketIsRetrying ? 'Reconnecting…' : 'Retry'}
            </Button>
          )}
          {connectionRestored && canRetry && onRetry && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span data-testid="offline-status">
            You are offline • network actions are paused
            {dataSource === 'cached' && ` • showing saved messages, ${describeLastSynced(lastSyncedAt)}`}
            {messageQueue.length > 0
              ? ` • ${messageQueue.length} message${messageQueue.length !== 1 ? 's' : ''} queued`
              : ''}
          </span>
          <Link href="/offline" className="underline whitespace-nowrap">
            What works offline
          </Link>
        </>
      )}
    </div>
  );
};
