import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ChatEngine from './ChatEngine';
import authSlice from '@/store/slices/authSlice';
import chatSlice from '@/store/slices/chatSlice';
import uiSlice from '@/store/slices/uiSlice';
import type { ChatMessage } from '@/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/chat',
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe('ChatEngine Component - Export feature', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  const sampleMessages: ChatMessage[] = [
    {
      id: 'm1',
      type: 'user',
      content: 'What is my current balance?',
      timestamp: '2026-09-29T10:00:00.000Z',
    },
    {
      id: 'm2',
      type: 'agent',
      content: 'Your balance is 500 XLM.',
      timestamp: '2026-09-29T10:00:05.000Z',
      metadata: {
        tokenType: 'XLM',
        amount: '500',
        status: 'success',
      },
    },
  ];

  const createTestStore = (initialMessages: ChatMessage[] = []) => {
    return configureStore({
      reducer: {
        auth: authSlice,
        chat: chatSlice,
        ui: uiSlice,
      },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: {
            id: 'user-1',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
          },
          token: 'token-123',
          isLoading: false,
          error: null,
          hasStellarAccount: true,
          stellarAccount: null,
          accountSetupStatus: {
            funding: { success: true, amount: '10' },
            deployment: { success: true },
            fullyReady: true,
          },
        },
        chat: {
          messages: initialMessages,
          conversations: [],
          currentConversation: {
            id: 'conv-test-99',
            title: 'Test Conversation',
            isActive: true,
            createdAt: '2026-09-29T09:00:00.000Z',
            updatedAt: '2026-09-29T09:00:00.000Z',
            userId: 'user-1',
            messageCount: initialMessages.length,
          },
          isLoading: false,
          error: null,
          isTyping: false,
          agentStatus: {
            isConnected: true,
            lastHealthCheck: null,
            capabilities: null,
          },
          chatHistory: {},
        },
      },
    });
  };

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test-export-blob');
    mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled export actions with tooltip hint when chat is empty', () => {
    const store = createTestStore([]);
    render(
      <Provider store={store}>
        <ChatEngine />
      </Provider>
    );

    const mdButton = screen.getByRole('button', { name: 'Export as Markdown' });
    const jsonButton = screen.getByRole('button', { name: 'Export as JSON' });

    expect(mdButton).toBeDisabled();
    expect(jsonButton).toBeDisabled();

    expect(mdButton).toHaveAttribute('title', 'Chat is empty (nothing to export)');
    expect(jsonButton).toHaveAttribute('title', 'Chat is empty (nothing to export)');

    // Ensure tooltips are present in DOM
    const tooltips = screen.getAllByRole('tooltip');
    expect(tooltips.length).toBeGreaterThanOrEqual(2);
    expect(tooltips[0]).toHaveTextContent('Chat is empty (nothing to export)');

    // Clicking disabled buttons should not trigger download
    fireEvent.click(mdButton);
    fireEvent.click(jsonButton);
    expect(mockCreateObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('invokes download handler with expected markdown blob content and filename', async () => {
    const store = createTestStore(sampleMessages);
    render(
      <Provider store={store}>
        <ChatEngine />
      </Provider>
    );

    const mdButton = screen.getByRole('button', { name: 'Export as Markdown' });
    expect(mdButton).not.toBeDisabled();

    fireEvent.click(mdButton);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/markdown');

    const textContent = await blobArg.text();
    expect(textContent).toContain('## User');
    expect(textContent).toContain('What is my current balance?');
    expect(textContent).toContain('## Agent');
    expect(textContent).toContain('Your balance is 500 XLM.');
    expect(textContent).toContain('### Metadata');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('invokes download handler with expected JSON blob content and filename', async () => {
    const store = createTestStore(sampleMessages);
    render(
      <Provider store={store}>
        <ChatEngine />
      </Provider>
    );

    const jsonButton = screen.getByRole('button', { name: 'Export as JSON' });
    expect(jsonButton).not.toBeDisabled();

    fireEvent.click(jsonButton);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('application/json');

    const textContent = await blobArg.text();
    const parsed = JSON.parse(textContent);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].content).toBe('What is my current balance?');
    expect(parsed[1].metadata.amount).toBe('500');

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
