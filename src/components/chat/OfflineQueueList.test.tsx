// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/types';
import { OfflineQueueList } from './OfflineQueueList';

const { chat } = vi.hoisted(() => ({
  chat: {
    messageQueue: [] as Array<{ id: string; query: string }>,
    messages: [] as ChatMessage[],
  },
}));

vi.mock('@/store', () => ({
  useAppSelector: (selector: (state: { chat: typeof chat }) => unknown) => selector({ chat }),
}));

function userMessage(id: string, metadata: ChatMessage['metadata']): ChatMessage {
  return { id, type: 'user', content: 'hello', timestamp: '2026-11-24T00:00:00Z', metadata };
}

describe('OfflineQueueList delivery states (#547)', () => {
  beforeEach(() => {
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
});
