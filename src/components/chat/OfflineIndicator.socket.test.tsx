// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SocketConnectionState } from '@/types/socket';
import type { ManualReconnectResult } from '@/components/providers/SocketProvider';
import { OfflineIndicator, describeSocketState } from './OfflineIndicator';

const { dispatch, chat, socketContext } = vi.hoisted(() => ({
  dispatch: vi.fn(),
  chat: { isOnline: true, messageQueue: [] as Array<{ id: string; query: string }> },
  socketContext: {
    current: undefined as
      | undefined
      | {
          connectionState: SocketConnectionState;
          reconnectAttempt: number;
          maxReconnectAttempts: number;
          isRetrying?: boolean;
          lastRetryResult?: ManualReconnectResult | null;
          retry: () => void;
        },
  },
}));

vi.mock('@/store', () => ({
  useAppDispatch: () => dispatch,
  useAppSelector: (selector: (state: { chat: typeof chat }) => unknown) => selector({ chat }),
}));

vi.mock('@/store/slices/chatSlice', () => ({
  setOnlineStatus: (isOnline: boolean) => ({ type: 'chat/setOnlineStatus', payload: isOnline }),
  loadMessageQueue: () => ({ type: 'chat/loadMessageQueue' }),
}));

vi.mock('@/components/providers/SocketProvider', () => ({
  useOptionalSocket: () => socketContext.current,
}));

function withSocket(
  connectionState: SocketConnectionState,
  attempt = 0,
  retry = vi.fn(),
  extra: { isRetrying?: boolean; lastRetryResult?: ManualReconnectResult | null } = {},
) {
  socketContext.current = {
    connectionState,
    reconnectAttempt: attempt,
    maxReconnectAttempts: 5,
    retry,
    ...extra,
  };
  return retry;
}

describe('OfflineIndicator socket status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chat.isOnline = true;
    chat.messageQueue = [];
    socketContext.current = undefined;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing outside a SocketProvider while online', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each<SocketConnectionState>(['idle', 'connected'])(
    'renders nothing for the %s state',
    (state) => {
      withSocket(state);
      const { container } = render(<OfflineIndicator />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it('shows connecting and reconnecting progress', () => {
    withSocket('connecting');
    const view = render(<OfflineIndicator />);
    expect(screen.getByText('Connecting to live updates…')).toBeInTheDocument();

    withSocket('reconnecting', 2);
    view.rerender(<OfflineIndicator />);
    expect(screen.getByText('Reconnecting to live updates (attempt 2 of 5)…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('offers a retry when reconnection is exhausted', () => {
    const retry = withSocket('exhausted', 5);
    render(<OfflineIndicator />);
    expect(screen.getByText('Live updates unavailable • could not reconnect')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('offers a retry when the socket was disconnected', () => {
    const retry = withSocket('disconnected');
    render(<OfflineIndicator />);
    expect(screen.getByText('Live updates disconnected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('keeps the offline message when the browser is offline regardless of socket state', () => {
    chat.isOnline = false;
    withSocket('reconnecting', 1);
    render(<OfflineIndicator />);
    expect(screen.getByText(/network actions are paused/)).toBeInTheDocument();
  });

  it('links to the offline guidance route only while offline (#553)', () => {
    withSocket('connected');
    const online = render(<OfflineIndicator />);
    expect(screen.queryByRole('link', { name: 'What works offline' })).toBeNull();
    online.unmount();

    chat.isOnline = false;
    render(<OfflineIndicator />);
    expect(screen.getByRole('link', { name: 'What works offline' })).toHaveAttribute(
      'href',
      '/offline',
    );
  });

  it('describes every visible state and none for idle or connected', () => {
    expect(describeSocketState('idle')).toBeNull();
    expect(describeSocketState('connected')).toBeNull();
    expect(describeSocketState('reconnecting', 0, 0)).toBe('Reconnecting to live updates…');
  });

  describe('manual reconnect control (#286)', () => {
    it('prevents concurrent reconnect calls on rapid clicks', () => {
      const retry = withSocket('exhausted', 5);
      render(<OfflineIndicator />);

      const button = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(button);
      fireEvent.click(button);

      expect(retry).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Reconnecting…' })).toBeDisabled();
    });

    it('announces reconnect success in a polite status region, preserves route state, and auto-dismisses', () => {
      vi.useFakeTimers();
      window.history.pushState({}, '', '/chat/session-42?tab=active#draft');
      const retry = withSocket('exhausted', 5);
      const view = render(<OfflineIndicator />);

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(retry).toHaveBeenCalledOnce();

      withSocket('connecting', 0, retry, { isRetrying: true, lastRetryResult: null });
      view.rerender(<OfflineIndicator />);

      withSocket('connected', 0, retry, { isRetrying: false, lastRetryResult: 'succeeded' });
      view.rerender(<OfflineIndicator />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('Live updates reconnected');
      expect(window.location.pathname).toBe('/chat/session-42');
      expect(window.location.search).toBe('?tab=active');
      expect(window.location.hash).toBe('#draft');

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.queryByText('Live updates reconnected')).not.toBeInTheDocument();
    });

    it('announces reconnect failure and re-enables Retry for a subsequent attempt', () => {
      const retry = withSocket('disconnected');
      const view = render(<OfflineIndicator />);

      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
      expect(retry).toHaveBeenCalledTimes(1);

      withSocket('connecting', 0, retry, { isRetrying: true, lastRetryResult: null });
      view.rerender(<OfflineIndicator />);

      withSocket('disconnected', 0, retry, { isRetrying: false, lastRetryResult: 'failed' });
      view.rerender(<OfflineIndicator />);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Reconnect failed • live updates disconnected',
      );

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      expect(retryButton).toBeEnabled();
      fireEvent.click(retryButton);
      expect(retry).toHaveBeenCalledTimes(2);
    });
  });
});
