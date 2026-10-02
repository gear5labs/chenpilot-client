// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgentMessage from './AgentMessage';
import { ChatMessage } from '@/types';

describe('AgentMessage component with CodeBlock', () => {
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
      type: 'agent',
      content: 'Here is some `inline code` for testing.',
      timestamp: new Date().toISOString(),
    };

    render(<AgentMessage message={message} />);

    const inlineCode = screen.getByText('inline code');
    expect(inlineCode).toBeDefined();
    expect(inlineCode.tagName.toLowerCase()).toBe('code');
  });

  it('renders fenced code blocks with language badge and copy button', () => {
    const message: ChatMessage = {
      id: '2',
      type: 'agent',
      content: 'Here is a python snippet:\n```python\ndef greet():\n    print("Hello from Python")\n```',
      timestamp: new Date().toISOString(),
    };

    render(<AgentMessage message={message} />);

    // Language badge
    expect(screen.getByText('python')).toBeDefined();

    // Code content
    expect(screen.getByText(/Hello from Python/)).toBeDefined();

    // Action buttons in CodeBlock header
    expect(screen.getByRole('button', { name: /copy code/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /toggle line numbers/i })).toBeDefined();
  });
});
