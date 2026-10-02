// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserMessage from './UserMessage';
import { ChatMessage } from '@/types';

vi.mock('@/store', () => ({
  useAppSelector: vi.fn((selector) =>
    selector({
      chat: { pendingMessages: new Set() },
    })
  ),
  useAppDispatch: vi.fn(() => vi.fn()),
}));

describe('UserMessage component with CodeBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders inline code with monospace styling', () => {
    const message: ChatMessage = {
      id: '1',
      type: 'user',
      content: 'Here is `git status` command',
      timestamp: new Date().toISOString(),
    };

    render(<UserMessage message={message} />);

    const inlineCode = screen.getByText('git status');
    expect(inlineCode).toBeDefined();
    expect(inlineCode.tagName.toLowerCase()).toBe('code');
    expect(inlineCode.className).toContain('font-mono');
  });

  it('renders code blocks with language badge and copy button', () => {
    const message: ChatMessage = {
      id: '2',
      type: 'user',
      content: '```typescript\nconst greeting: string = "hello";\n```',
      timestamp: new Date().toISOString(),
    };

    render(<UserMessage message={message} />);

    expect(screen.getByText('typescript')).toBeDefined();
    expect(screen.getByText('const')).toBeDefined();
    expect(screen.getByText(/greeting/)).toBeDefined();
    expect(screen.getByRole('button', { name: /copy code/i })).toBeDefined();
  });
});
