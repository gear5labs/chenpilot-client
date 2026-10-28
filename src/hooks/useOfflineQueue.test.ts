// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOfflineQueue } from './useOfflineQueue';

type QueuedRow = { id: string; query: string; timestamp: string };

const { dispatch, chat, sendImpl, toastApi } = vi.hoisted(() => ({
  dispatch: vi.fn(),
  chat: { isOnline: true, messageQueue: [] as QueuedRow[], error: null as string | null },
  sendImpl: vi.fn(),
  toastApi: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/store', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (state: { chat: typeof chat }) => unknown) => selector({ chat }),
}));

vi.mock('@/store/slices/chatSlice', () => ({
  queueMessage: (payload: { id: string; query: string }) => ({ type: 'chat/queueMessage', payload }),
  dequeueMessage: (payload: string) => ({ type: 'chat/dequeueMessage', payload }),
  sendMessage: (arg: { query: string; tempId: string }) => ({ type: 'chat/sendMessage', arg }),
}));

vi.mock('react-hot-toast', () => ({ default: toastApi }));

const row = (id: string, query = `query ${id}`): QueuedRow => ({
  id,
  query,
  timestamp: '2026-01-01T00:00:00.000Z',
});

const actionsOfType = (type: string) =>
  dispatch.mock.calls.map(([action]) => action).filter((action) => action?.type === type);

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.isOnline = false;
    chat.messageQueue = [];
    chat.error = null;
    sendImpl.mockReset();
    sendImpl.mockResolvedValue(undefined);
    dispatch.mockImplementation((action: { type: string; arg?: unknown }) =>
      action.type === 'chat/sendMessage' ? { unwrap: () => sendImpl(action.arg) } : action,
    );
  });

  describe('which actions are queued', () => {
    it('queues a chat message by default and returns its id', () => {
      const { result } = renderHook(() => useOfflineQueue());

      let id: string | null = null;
      act(() => {
        id = result.current.queueMessageForSending('hello');
      });

      expect(id).toMatch(/^queued_/);
      expect(actionsOfType('chat/queueMessage')).toEqual([
        { type: 'chat/queueMessage', payload: { id, query: 'hello' } },
      ]);
    });

    it.each(['payment', 'transaction_signing', 'wallet_connection', 'contact_mutation', 'account_change'] as const)(
      'refuses to queue %s and explains why',
      (kind) => {
        const { result } = renderHook(() => useOfflineQueue());

        let id: string | null = 'unset';
        act(() => {
          id = result.current.queueMessageForSending('send 100 XLM', kind);
        });

        expect(id).toBeNull();
        expect(actionsOfType('chat/queueMessage')).toHaveLength(0);
        expect(toastApi.error).toHaveBeenCalledWith(expect.stringMatching(/not queued offline/));
      },
    );
  });

  describe('replay', () => {
    it('sends each queued message once, in order, and dequeues it', async () => {
      chat.messageQueue = [row('a'), row('b')];
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.processQueue();
      });

      expect(sendImpl.mock.calls.map(([arg]) => arg)).toEqual([
        { query: 'query a', tempId: 'a' },
        { query: 'query b', tempId: 'b' },
      ]);
      expect(actionsOfType('chat/dequeueMessage').map((action) => action.payload)).toEqual(['a', 'b']);
      expect(result.current.replayOutcome).toEqual({ sent: 2, failed: 0, errors: [] });
      expect(toastApi.success).toHaveBeenCalledWith('All 2 queued messages sent!');
    });

    it('does not replay an item twice when replay is triggered again while it is in flight', async () => {
      chat.messageQueue = [row('a'), row('b')];
      let release: () => void = () => undefined;
      sendImpl.mockImplementationOnce(
        () => new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      const { result } = renderHook(() => useOfflineQueue());

      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.processQueue();
      });
      // A second trigger (for example the queue length changing) while 'a' is still sending.
      await act(async () => {
        await result.current.processQueue();
      });

      // 'a' is mid-send and 'b' is reserved by the first pass, so the second pass sends nothing.
      expect(sendImpl.mock.calls.map(([arg]) => arg.tempId)).toEqual(['a']);

      await act(async () => {
        release();
        await first;
      });

      // 'a' and 'b' were each sent exactly once across both passes.
      const sentIds = sendImpl.mock.calls.map(([arg]) => arg.tempId).sort();
      expect(sentIds).toEqual(['a', 'b']);
    });

    it('replays automatically once, when the device comes back online', async () => {
      chat.messageQueue = [row('a')];
      const { rerender } = renderHook(() => useOfflineQueue());
      expect(sendImpl).not.toHaveBeenCalled();

      chat.isOnline = true;
      rerender();
      await waitFor(() => expect(sendImpl).toHaveBeenCalledTimes(1));
      rerender();
      await waitFor(() => expect(actionsOfType('chat/dequeueMessage')).toHaveLength(1));
      expect(sendImpl).toHaveBeenCalledTimes(1);
    });

    it('reports the replay outcome when some items fail and never retries them on its own', async () => {
      chat.messageQueue = [row('a'), row('b')];
      sendImpl.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('rate limited'));
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.processQueue();
      });

      expect(result.current.replayOutcome).toEqual({ sent: 1, failed: 1, errors: ['rate limited'] });
      expect(actionsOfType('chat/dequeueMessage').map((action) => action.payload)).toEqual(['a', 'b']);
      expect(toastApi.error).toHaveBeenCalledWith('1 queued sent, 1 failed: rate limited');
      expect(toastApi.success).not.toHaveBeenCalled();
    });

    it('reports a total failure without claiming success', async () => {
      chat.messageQueue = [row('a')];
      sendImpl.mockRejectedValueOnce(new Error('offline again'));
      const { result } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.processQueue();
      });

      expect(result.current.replayOutcome).toEqual({ sent: 0, failed: 1, errors: ['offline again'] });
      expect(toastApi.error).toHaveBeenCalledWith('Failed to send queued message: offline again');
      expect(toastApi.success).not.toHaveBeenCalled();
    });

    it('does nothing for an empty queue', async () => {
      const { result } = renderHook(() => useOfflineQueue());
      await act(async () => {
        await result.current.processQueue();
      });
      expect(sendImpl).not.toHaveBeenCalled();
      expect(result.current.replayOutcome).toBeNull();
    });
  });
});
