import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types';
import { buildOfflineQueueRows, queuedDeliveryState } from './offlineQueueDisplay';

function userMessage(id: string, metadata: ChatMessage['metadata']): ChatMessage {
  return { id, type: 'user', content: 'hello', timestamp: '2026-11-24T00:00:00Z', metadata };
}

describe('offline queue delivery display (#547)', () => {
  it('never claims server delivery for an unacknowledged entry', () => {
    const rows = buildOfflineQueueRows([{ id: 'q1', query: 'hello' }]);

    expect(rows).toEqual([
      {
        id: 'q1',
        query: 'hello',
        state: 'queued',
        label: 'Queued — not sent to the server',
        acknowledged: false,
      },
    ]);
  });

  it('maps each visible state from the chat row metadata', () => {
    const messages = [
      userMessage('q1', { status: 'pending' }),
      userMessage('q2', { status: 'success' }),
      userMessage('q3', { status: 'failed' }),
      userMessage('q4', { delivery: 'queued', status: 'pending' }),
    ];

    expect(queuedDeliveryState('q1', messages)).toBe('sending');
    expect(queuedDeliveryState('q2', messages)).toBe('sent');
    expect(queuedDeliveryState('q3', messages)).toBe('failed');
    expect(queuedDeliveryState('q4', messages)).toBe('queued');

    const rows = buildOfflineQueueRows(
      ['q1', 'q2', 'q3', 'q4'].map((id) => ({ id, query: 'hello' })),
      messages,
    );
    expect(rows.map((row) => row.state)).toEqual(['sending', 'sent', 'failed', 'queued']);
    expect(rows.map((row) => row.acknowledged)).toEqual([false, true, false, false]);
  });

  it('ignores agent rows and entries whose chat row is absent', () => {
    const messages = [
      userMessage('q1', { status: 'success' }),
      { id: 'q1', type: 'agent', content: 'reply', timestamp: '2026-11-24T00:00:00Z' } as ChatMessage,
    ];

    expect(queuedDeliveryState('q1', messages.slice(1))).toBe('queued');
    expect(queuedDeliveryState('missing', messages)).toBe('queued');
  });
});
