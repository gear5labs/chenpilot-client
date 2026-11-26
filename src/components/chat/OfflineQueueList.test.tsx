// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import { OfflineQueueList } from './OfflineQueueList';

const { chat, dispatch, dequeueMessage } = vi.hoisted(() => ({
  chat: {
    messageQueue: [] as Array<{ id: string; query: string }>,
    messages: [] as ChatMessage[],
  },
  dispatch: vi.fn(),
  dequeueMessage: vi.fn((id: string) => ({ type: 'chat/dequeueMessage', payload: id })),
}));

vi.mock('@/store', () => ({
  useAppSelector: (selector: (state: { chat: typeof chat }) => unknown) => selector({ chat }),
  useAppDispatch: () => dispatch,
}));

vi.mock('@/store/slices/chatSlice', () => ({ dequeueMessage }));

function userMessage(id: string, metadata: ChatMessage['metadata']): ChatMessage {
  return { id, type: 'user', content: 'hello', timestamp: '2026-11-24T00:00:00Z', metadata };
}

describe('OfflineQueueList delivery states (#547)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.messageQueue = [];
    chat.messages = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when there is no queued work', () => {
    const { container } = render(<OfflineQueueList />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows queued, sending, delivered, and failed states without implying early delivery', () => {
    chat.messageQueue = ['q1', 'q2', 'q3', 'q4'].map((id, index) => ({
      id,
      query: `message ${index + 1}`,
    }));
    chat.messages = [
      userMessage('q2', { status: 'pending' }),
      userMessage('q3', { status: 'success' }),
      userMessage('q4', { status: 'failed' }),
    ];

    render(<OfflineQueueList />);

    expect(screen.getByTestId('offline-queue-state-q1').textContent).toContain('not sent');
    expect(screen.getByTestId('offline-queue-state-q2').textContent).toContain('awaiting server acknowledgement');
    expect(screen.getByTestId('offline-queue-state-q3').textContent).toContain('acknowledged by the server');
    expect(screen.getByTestId('offline-queue-state-q4').textContent).toContain('not delivered');
    expect(screen.getByText('message 1')).toBeDefined();
  });

  it('discards only the selected queued item', () => {
    chat.messageQueue = [
      { id: 'q1', query: 'first' },
      { id: 'q2', query: 'second' },
      { id: 'q3', query: 'third' },
    ];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<OfflineQueueList />);

    fireEvent.click(screen.getByRole('button', { name: 'Discard unsent message q2' }));

    expect(dequeueMessage).toHaveBeenCalledTimes(1);
    expect(dequeueMessage).toHaveBeenCalledWith('q2');
    expect(dispatch).toHaveBeenCalledWith({ type: 'chat/dequeueMessage', payload: 'q2' });
  });

  it('confirms non-empty text but not an empty queued entry', () => {
    chat.messageQueue = [
      { id: 'q1', query: 'important draft' },
      { id: 'q2', query: '   ' },
    ];
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<OfflineQueueList />);

    fireEvent.click(screen.getByRole('button', { name: 'Discard unsent message q1' }));
    expect(confirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Discard unsent message q2' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it('keeps the item when the user declines confirmation', () => {
    chat.messageQueue = [{ id: 'q1', query: 'important draft' }];
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OfflineQueueList />);

    fireEvent.click(screen.getByRole('button', { name: 'Discard unsent message q1' }));

    expect(dispatch).not.toHaveBeenCalled();
  });
});
