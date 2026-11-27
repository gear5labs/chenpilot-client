import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  queueMessage,
  dequeueMessage,
  sendMessage,
  isQueuedMessageExpired,
} from '@/store/slices/chatSlice';
import {
  OFFLINE_QUEUE_OWNER_MISMATCH_NOTICE,
  partitionQueueByOwner,
  rememberOfflineQueueOwner,
} from './offlineQueueOwnership';
import toast from 'react-hot-toast';

export const useOfflineQueue = () => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue, error } = useAppSelector((state) => state.chat);
  const userId = useAppSelector((state) => state.auth.user?.id ?? null);

  useEffect(() => {
    if (error && /offline .*unavailable|browser storage is full|expired offline data/i.test(error)) {
      toast.error(error, { id: 'offline-storage-quota' });
    }
  }, [error]);

  // Guards against replaying the queue twice when online/offline events repeat (#290)
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const { owned, quarantined } = partitionQueueByOwner(messageQueue, userId);

      if (quarantined.length > 0) {
        for (const entry of quarantined) {
          dispatch(dequeueMessage(entry.id));
        }
        toast.error(OFFLINE_QUEUE_OWNER_MISMATCH_NOTICE, {
          id: 'offline-queue-owner-mismatch',
        });
      }

      let sent = 0;
      let failed = 0;

      for (const queuedMsg of owned) {
        // Never replay a stale prompt (#290)
        if (isQueuedMessageExpired(queuedMsg)) {
          dispatch(dequeueMessage(queuedMsg.id));
          continue;
        }
        try {
          // Send with the queued row's id so it moves queued → sending → sent instead of a
          // second bubble being added (#266)
          await dispatch(sendMessage({ query: queuedMsg.query, tempId: queuedMsg.id })).unwrap();

          dispatch(dequeueMessage(queuedMsg.id));
          sent += 1;
          toast.success('Queued message sent');
        } catch (error) {
          // The row is now `failed` with a retry action; drop it from the automatic queue
          dispatch(dequeueMessage(queuedMsg.id));
          failed += 1;
          const errorMsg = error instanceof Error ? error.message : String(error);
          toast.error(`Failed to send queued message: ${errorMsg}`);
        }
      }

      if (sent > 0) {
        toast.success(`Sent ${sent} queued message${sent !== 1 ? 's' : ''}.`);
      }
      if (failed > 0) {
        toast.error(`Failed to send ${failed} queued message${failed !== 1 ? 's' : ''}.`, {
          id: 'offline-queue-replay-failures',
        });
      }
    } finally {
      processingRef.current = false;
    }
  }, [dispatch, messageQueue, userId]);

  // Process queued messages when coming back online or when the authenticated
  // account changes (queue length alone would miss a same-length swap). Declared
  // after processQueue: the dependency array is evaluated during render, so
  // referencing it earlier throws (#290).
  useEffect(() => {
    if (isOnline && messageQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, messageQueue, processQueue]);

  const queueMessageForSending = useCallback(
    (query: string) => {
      const msgId = `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      rememberOfflineQueueOwner(userId);
      dispatch(
        queueMessage({
          id: msgId,
          query,
        })
      );
      return msgId;
    },
    [dispatch, userId]
  );

  return {
    isOnline,
    messageQueue,
    queueMessageForSending,
    processQueue,
  };
};
