import { useEffect, useRef } from 'react';
import { useSocket as useSocketContext } from '@/components/providers/SocketProvider';

export function useSocket() {
  const context = useSocketContext();
  
  return {
    socket: context.socket,
    socketManager: context.socketManager,
    isConnected: context.isConnected,
    connect: context.connect,
    disconnect: context.disconnect,
    emit: context.emit,
    on: context.on,
    off: context.off,
    once: context.once,
  };
}

// Fix #51: Stabilize callback with useRef to prevent constant re-subscription
// when the callback reference changes on every render.
export function useSocketEvent(event: string, callback: (...args: any[]) => void) {
  const { socket, on, off } = useSocket();
  const callbackRef = useRef(callback);

  // Keep the ref up to date without triggering re-subscription
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (socket) {
      // Use a stable wrapper that always calls the latest callback via ref
      const stableCallback = (...args: any[]) => {
        callbackRef.current(...args);
      };

      on(event, stableCallback);

      return () => {
        off(event, stableCallback);
      };
    }
    // Only re-subscribe when the socket or event name changes.
    // The callback ref is excluded to prevent re-subscribe on every render.
  }, [socket, event, on, off]);
}

export function useSocketConnection() {
  const { isConnected, connect, disconnect } = useSocket();
  
  return {
    isConnected,
    connect,
    disconnect,
  };
}
