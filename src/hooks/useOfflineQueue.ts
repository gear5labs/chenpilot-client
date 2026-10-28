import { useEffect, useCallback, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  queueMessage,
  dequeueMessage,
  sendMessage,
} from '@/store/slices/chatSlice';
import { offlineQueueRefusal, type OfflineActionKind } from '@/utils/offlineActions';
import toast from 'react-hot-toast';

/** Result of the most recent attempt to replay the offline queue. */
export interface OfflineReplayOutcome {
  sent: number;
  failed: number;
  /** Failure message for each queued item that could not be sent. */
  errors: string[];
}

export const useOfflineQueue = () => {
  const dispatch = useAppDispatch();
  const { isOnline, messageQueue, error } = useAppSelector((state) => state.chat);
  const [replayOutcome, setReplayOutcome] = useState<OfflineReplayOutcome | null>(null);
  // Ids currently being replayed. Removing an item from the queue changes the queue
  // length, which re-runs the replay effect; without this guard a second pass would
  // send the items the first pass has not reached yet a second time.
  const replayingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (error && /offline .*unavailable|browser storage is full|expired offline data/i.test(error)) {
      toast.error(error, { id: 'offline-storage-quota' });
    }
  }, [error]);

  const processQueue = useCallback(async () => {
    const pending = messageQueue.filter((queued) => !replayingRef.current.has(queued.id));
    if (pending.length === 0) return;

    for (const queued of pending) replayingRef.current.add(queued.id);

    const outcome: OfflineReplayOutcome = { sent: 0, failed: 0, errors: [] };

    for (const queuedMsg of pending) {
      try {
        // Send with the queued row's id so it moves queued → sending → sent instead of a
        // second bubble being added (#266)
        await dispatch(sendMessage({ query: queuedMsg.query, tempId: queuedMsg.id })).unwrap();
        outcome.sent += 1;
      } catch (caught: unknown) {
        // The row is now `failed` with a retry action; drop it from the automatic queue
        // so a failed item is never replayed on its own.
        outcome.failed += 1;
        outcome.errors.push(caught instanceof Error ? caught.message : String(caught));
      } finally {
        dispatch(dequeueMessage(queuedMsg.id));
        replayingRef.current.delete(queuedMsg.id);
      }
    }

    setReplayOutcome(outcome);

    if (outcome.failed === 0) {
      toast.success(
        outcome.sent === 1 ? 'Queued message sent' : `All ${outcome.sent} queued messages sent!`,
      );
    } else if (outcome.sent === 0) {
      toast.error(`Failed to send queued message: ${outcome.errors[0]}`);
    } else {
      toast.error(`${outcome.sent} queued sent, ${outcome.failed} failed: ${outcome.errors[0]}`);
    }
  }, [messageQueue, dispatch]);

  // Process queued messages when coming back online
  useEffect(() => {
    if (isOnline && messageQueue.length > 0) {
      void processQueue();
    }
  }, [isOnline, messageQueue.length, processQueue]);

  /**
   * Queue `query` for replay. Only kinds on the offline allowlist are queued; a
   * refused kind shows why and returns `null` without touching the queue.
   */
  const queueMessageForSending = useCallback(
    (query: string, kind: OfflineActionKind = 'chat_message') => {
      const refusal = offlineQueueRefusal(kind);
      if (refusal) {
        toast.error(refusal);
        return null;
      }

      const msgId = `queued_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      dispatch(
        queueMessage({
          id: msgId,
          query,
        })
      );
      return msgId;
    },
    [dispatch]
  );

  return {
    isOnline,
    messageQueue,
    queueMessageForSending,
    processQueue,
    replayOutcome,
  };
};
