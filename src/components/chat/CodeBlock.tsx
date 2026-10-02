'use client';

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Hash } from 'lucide-react';

export interface CodeBlockProps {
  code?: string;
  children?: React.ReactNode;
  language?: string;
  className?: string;
  inline?: boolean;
  defaultShowLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  children,
  language,
  className,
  inline = false,
  defaultShowLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(defaultShowLineNumbers);

  const rawCode = code ?? (typeof children === 'string' ? children : (children ? String(children) : ''));
  const cleanCode = rawCode.replace(/\n$/, '');
  const detectedLanguage = language || className?.replace(/language-/, '') || 'text';
  const normalizedLanguage = detectedLanguage.toLowerCase();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard:', err);
    }
  };

  const toggleLineNumbers = () => {
    setShowLineNumbers((prev) => !prev);
  };

  if (inline) {
    return (
      <code className="bg-gray-800 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono">
        {children ?? cleanCode}
      </code>
    );
  }

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-gray-800 bg-[#1e1e1e] font-mono text-sm shadow-md">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-gray-800 text-xs text-gray-400 select-none">
        <span className="font-semibold text-gray-300 uppercase tracking-wider text-[11px]">
          {normalizedLanguage}
        </span>
        <div className="flex items-center space-x-2">
          {/* Line Numbers Toggle */}
          <button
            type="button"
            onClick={toggleLineNumbers}
            className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
              showLineNumbers
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            aria-label="Toggle line numbers"
            title="Toggle line numbers"
          >
            <Hash className="h-3.5 w-3.5" />
            <span className="text-[11px]">Lines</span>
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Copy code"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400 text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Syntax Highlighted Code Body */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLongLines={false}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#6e7681',
            userSelect: 'none',
          }}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
            },
          }}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default CodeBlock;
