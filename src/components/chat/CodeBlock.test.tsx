// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeBlock from './CodeBlock';

describe('CodeBlock component', () => {
  const sampleCode = `function hello() {\n  console.log("Hello, world!");\n}`;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders code snippet with specified language', () => {
    render(<CodeBlock code={sampleCode} language="typescript" />);

    // Language badge displayed
    expect(screen.getByText('typescript')).toBeDefined();
    // Code content rendered
    expect(screen.getByText(/Hello, world!/)).toBeDefined();
  });

  it('copies code content to clipboard on copy button click', async () => {
    render(<CodeBlock code={sampleCode} language="javascript" />);

    const copyBtn = screen.getByRole('button', { name: /copy/i });
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleCode);

    // Shows copied indicator
    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeDefined();
    });
  });

  it('supports toggling line numbers on and off', () => {
    const { container } = render(
      <CodeBlock code={sampleCode} language="typescript" defaultShowLineNumbers={false} />
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle line numbers/i });
    expect(toggleBtn).toBeDefined();

    // Initially line numbers not shown (showLineNumbers: false)
    expect(container.querySelector('.linenumber, .react-syntax-highlighter-line-number')).toBeNull();

    // Click to toggle on
    fireEvent.click(toggleBtn);
    expect(container.querySelector('.linenumber, .react-syntax-highlighter-line-number')).not.toBeNull();

    // Click again to toggle off
    fireEvent.click(toggleBtn);
    expect(container.querySelector('.linenumber, .react-syntax-highlighter-line-number')).toBeNull();
  });

  it('renders plain text when no language is provided', () => {
    render(<CodeBlock code="echo 123" />);

    expect(screen.getByText('text')).toBeDefined();
    expect(screen.getByText(/echo 123/)).toBeDefined();
  });
});
