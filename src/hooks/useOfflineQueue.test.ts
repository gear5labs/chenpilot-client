import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineQueue } from './useOfflineQueue';
import apiService from '@/services/api';

vi.mock('react-redux', () => ({
  useAppDispatch: () => vi.fn(),
  useAppSelector: (selector: any) => selector({
    chat: { isOnline: false, messageQueue: [], error: null }
  }),
}));

describe('useOfflineQueue Classification & Replay Protection', () => {
  it('excludes payment/signing actions by default', () => {
        const { result } = renderHook(() => useOfflineQueue());

    let msgId;
        act(() => {
      msgId = result.current.queueMessageForSending('pay 10 xlm', 'payment' as any);
      });

    expect(msgId).toBeNull();
    });

  it('permits whitelisted offline actions', () => {
      const { result } = renderHook(() => useOfflineQueue());

    let msgId;
      act(() => {
      msgId = result.current.queueMessageForSending('hello chat', 'chat_message');
    });

    expect(msgId).not.toBeNull();
    });

  it('validates duplicate replay protection', () => {
    const replayed = new Set<string>();
    const id = 'test_item_1';

    expect(apiService.validateOfflineReplay(id, replayed)).toBe(true);
    expect(apiService.validateOfflineReplay(id, replayed)).toBe(false);
    });
      });


const row = (id: string, query = `query ${id}`): QueuedRow => ({
  id,
  query,
  timestamp: '2026-01-01T00:00:00.000Z',
});
