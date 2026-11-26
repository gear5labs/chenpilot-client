/**
 * Delivery display for locally queued messages (#547).
 *
 * A queue entry is not proof of server delivery. Only the chat row's delivery
 * metadata can say that the service acknowledged a message, so an entry with
 * no matching acknowledged row stays `queued` ("not sent").
 */
import { getDeliveryState, type DeliveryState } from '@/store/messageDelivery';
import type { ChatMessage } from '@/types';

export type QueuedMessageEntry = {
  id: string;
  query: string;
  timestamp?: string;
};

export interface OfflineQueueRow {
  id: string;
  query: string;
  state: DeliveryState;
  label: string;
  /** True only for the acknowledged `sent` state. */
  acknowledged: boolean;
}

export const DELIVERY_LABELS: Readonly<Record<DeliveryState, string>> = {
  queued: 'Queued — not sent to the server',
  sending: 'Sending — awaiting server acknowledgement',
  sent: 'Delivered — acknowledged by the server',
  failed: 'Failed — not delivered',
};

/** Resolve a queue entry's state from its chat row, defaulting safely to queued. */
export function queuedDeliveryState(
  entryId: string,
  messages: ReadonlyArray<Pick<ChatMessage, 'id' | 'type' | 'metadata'>>,
): DeliveryState {
  const message = messages.find((candidate) => candidate.id === entryId && candidate.type === 'user');
  return message ? getDeliveryState(message) ?? 'queued' : 'queued';
}

export function buildOfflineQueueRows(
  queue: ReadonlyArray<QueuedMessageEntry>,
  messages: ReadonlyArray<Pick<ChatMessage, 'id' | 'type' | 'metadata'>> = [],
): OfflineQueueRow[] {
  return queue.map((entry) => {
    const state = queuedDeliveryState(entry.id, messages);
    return {
      id: entry.id,
      query: entry.query,
      state,
      label: DELIVERY_LABELS[state],
      acknowledged: state === 'sent',
    };
  });
}
