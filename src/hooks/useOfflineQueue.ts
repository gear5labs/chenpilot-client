'use client';

import { useState, useCallback, useEffect } from 'react';
export const useOfflineQueue = () => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue, error } = useAppSelector((state) => state.chat);

  useEffect(() => {
    if (error && /offline .*unavailable|browser storage is full|expired offline data/i.test(error)) {
      toast.error(error, { id: 'offline-storage-quota' });
    }
  }, [error]);

export interface OfflineAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

export const useOfflineQueue = () => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue, error } = useAppSelector((state) => state.chat);

  useEffect(() => {
    if (error && /offline .*unavailable|browser storage is full|expired offline data/i.test(error)) {
      toast.error(error, { id: 'offline-storage-quota' });
    }
  }, [error]);

  // Process queued messages when coming back online
  useEffect(() => {
    if (isOnline && messageQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, messageQueue.length, processQueue]);

  const processQueue = useCallback(async () => {
    const queueCopy = [...messageQueue];

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineAction[]>([]);

  const isSupportedAction = useCallback((type: string): boolean => {
    const excluded = ['send_payment', 'sign_transaction', 'transfer', 'sign'];
    return !excluded.includes(type);
  }, []);

  const enqueueAction = useCallback((action: OfflineAction) => {
    if (!isSupportedAction(action.type)) {
      return false;
    }
    setQueue((prev) => {
      if (prev.some((item) => item.id === action.id)) {
        return prev;
      }
      return [...prev, { ...action, timestamp: Date.now() }];
    });
    return true;
  }, [isSupportedAction]);

  return {
    queue,
    enqueueAction,
    isSupportedAction,
  };
}
