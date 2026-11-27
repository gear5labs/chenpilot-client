'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Socket } from 'socket.io-client';
import {
  SocketManager,
  SocketConfig,
  initializeSocketManager,
} from '@/services/socketManager';
import { SocketReconnectGate } from '@/services/socketConnectivity';
import {
  INITIAL_SOCKET_CONNECTION_STATE,
  isSocketConnected,
  type SocketConnectionState,
} from '@/types/socket';

export type ManualReconnectResult = 'succeeded' | 'failed';

interface SocketContextType {
  socket: Socket | null;
  socketManager: SocketManager | null;
  isConnected: boolean;
  connectionState: SocketConnectionState;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  /** True while a user-initiated manual reconnect is in flight (#286). */
  isRetrying: boolean;
  /** Outcome of the most recent user-initiated manual reconnect (#286). */
  lastRetryResult: ManualReconnectResult | null;
  retry: () => void;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: unknown) => boolean;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
  once: (event: string, callback: (...args: unknown[]) => void) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  config: SocketConfig;
  configKey?: string;
  autoConnect?: boolean;
}

type OwnedListener = {
  event: string;
  callback: (...args: unknown[]) => void;
};

export function SocketProvider({
  children,
  config,
  configKey,
  autoConnect = true,
}: SocketProviderProps) {
  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    INITIAL_SOCKET_CONNECTION_STATE,
  );
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastRetryResult, setLastRetryResult] = useState<ManualReconnectResult | null>(null);

  const connectionStateRef = useRef<SocketConnectionState>(INITIAL_SOCKET_CONNECTION_STATE);
  const retryInFlightRef = useRef(false);

  // Derived from the single shared state, never tracked separately (#279).
  const isConnected = isSocketConnected(connectionState);

  // The manager is a singleton, so a new config object on every render must not
  // tear down listeners registered by children. Only configKey/autoConnect
  // intentionally re-bind the provider (#541).
  const configRef = useRef(config);
  configRef.current = config;
  const ownedListeners = useRef<OwnedListener[]>([]);

  const rememberListener = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      const listeners = ownedListeners.current;
      if (
        !listeners.some(
          (entry) => entry.event === event && entry.callback === callback,
        )
      ) {
        listeners.push({ event, callback });
      }
    },
    [],
  );

  useEffect(() => {
    const manager = initializeSocketManager(configRef.current);
    setSocketManager(manager);
    const unsubscribeState = manager.onStateChange((state, attempt) => {
      connectionStateRef.current = state;
      setConnectionState(state);
      setReconnectAttempt(attempt);

      if (retryInFlightRef.current) {
        if (state === 'connected') {
          retryInFlightRef.current = false;
          setIsRetrying(false);
          setLastRetryResult('succeeded');
        } else if (state === 'exhausted' || state === 'disconnected') {
          retryInFlightRef.current = false;
          setIsRetrying(false);
          setLastRetryResult('failed');
        }
      }
    });

    if (autoConnect) {
      const socketInstance = manager.connect();
      setSocket(socketInstance);
    }

    return () => {
      retryInFlightRef.current = false;
      setIsRetrying(false);
      unsubscribeState();
      // Remove handlers registered through this provider before closing the
      // socket. Without this, late socket events can still call unmounted UI.
      for (const { event, callback } of ownedListeners.current) {
        manager.off(event, callback);
      }
      ownedListeners.current = [];
      manager.disconnect();
    };
  }, [configKey, autoConnect]);

  // Socket.io retries on its own even without a network. Pause those attempts
  // while offline and allow only one resume attempt when connectivity returns (#539).
  useEffect(() => {
    if (!socketManager) return;

    const gate = new SocketReconnectGate({
      isOnline: () => navigator.onLine,
      onPause: () => {
        socketManager.disconnect();
        setSocket(null);
      },
    });

    const handleOffline = () => gate.handleOffline();
    const handleOnline = () => {
      gate.handleOnline();
      if (gate.takeAttempt()) {
        socketManager.retry();
        setSocket(socketManager.getSocket());
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [socketManager]);

  const connect = useCallback(() => {
    if (socketManager) {
      const socketInstance = socketManager.connect();
      setSocket(socketInstance);
    }
  }, [socketManager]);

  const retry = useCallback(() => {
    if (!socketManager) {
      return;
    }

    // Prevent concurrent manual reconnects or retries while already connecting/connected (#286).
    const currentState = connectionStateRef.current;
    if (
      retryInFlightRef.current ||
      currentState === 'connecting' ||
      currentState === 'reconnecting' ||
      currentState === 'connected'
    ) {
      return;
    }

    retryInFlightRef.current = true;
    setIsRetrying(true);
    setLastRetryResult(null);
    socketManager.retry();
    setSocket(socketManager.getSocket());
  }, [socketManager]);

  const disconnect = useCallback(() => {
    if (socketManager) {
      retryInFlightRef.current = false;
      setIsRetrying(false);
      socketManager.disconnect();
      setSocket(null);
    }
  }, [socketManager]);

  const emit = useCallback(
    (event: string, data?: unknown): boolean =>
      socketManager?.emit(event, data) ?? false,
    [socketManager],
  );

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socketManager?.on(event, callback);
      rememberListener(event, callback);
    },
    [socketManager, rememberListener],
  );

  const off = useCallback(
    (event: string, callback?: (...args: unknown[]) => void) => {
      socketManager?.off(event, callback);
      ownedListeners.current = ownedListeners.current.filter(
        (entry) =>
          entry.event !== event ||
          (callback !== undefined && entry.callback !== callback),
      );
    },
    [socketManager],
  );

  const once = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socketManager?.once(event, callback);
      rememberListener(event, callback);
    },
    [socketManager, rememberListener],
  );

  const value: SocketContextType = {
    socket,
    socketManager,
    isConnected,
    connectionState,
    reconnectAttempt,
    maxReconnectAttempts: socketManager?.getMaxReconnectAttempts() ?? 0,
    isRetrying,
    lastRetryResult,
    retry,
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Like `useSocket`, but returns `undefined` outside a SocketProvider so status
 * UI that can render without a socket (e.g. OfflineIndicator) can opt in.
 */
export function useOptionalSocket(): SocketContextType | undefined {
  return useContext(SocketContext);
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
