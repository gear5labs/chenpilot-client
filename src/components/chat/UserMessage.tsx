'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/types';
import { Copy, Check, Edit2, Check as CheckIcon, X, Clock, MessageSquare } from 'lucide-react';
import { useAppSelector } from '@/store';
import VoiceMessagePlayer from '@/components/chat/VoiceMessagePlayer';
import CodeBlock from './CodeBlock';

interface UserMessageProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onReply?: (messageId: string) => void;
}

export default function UserMessage({ message, onCopy, onEdit, onReply }: UserMessageProps) {
  const { pendingMessages } = useAppSelector((state) => state.chat);
  const isPending = Boolean(
    pendingMessages &&
      (pendingMessages instanceof Set
        ? pendingMessages.has(message.id)
        : (pendingMessages as any)[message.id])
  );
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(
    typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
  );

  const isVoice = message.messageType === 'voice' && !!message.voice;

  const handleCopy = async () => {
    const content =
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy?.(content);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    );
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(
      typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // ── Reply-count badge (shared between both variants) ───────────────────────
  const replyBadge =
    (message.replyCount ?? 0) > 0 && onReply ? (
      <button
        onClick={() => onReply(message.id)}
        className="mt-1.5 flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        aria-label={`View ${message.replyCount} ${message.replyCount === 1 ? 'reply' : 'replies'}`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>
          {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
        </span>
      </button>
    ) : null;

  // ── Voice message bubble ───────────────────────────────────────────────────
  if (isVoice) {
    return (
      <div className="flex flex-col items-end">
        <div className="group relative">
          <VoiceMessagePlayer
            audioUrl={message.voice!.audioUrl}
            duration={message.voice!.duration}
            transcript={message.voice!.transcript || undefined}
            variant="user"
          />

          {/* Hover actions */}
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-gray-900/90 rounded-lg px-1 py-0.5 border border-gray-700/50">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Copy transcript"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {onReply && (
              <button
                onClick={() => onReply(message.id)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Reply in thread"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {replyBadge}
      </div>
    );
  }

  // ── Text message bubble ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end">
      <div
        className={`max-w-3xl ${isPending ? 'opacity-75' : ''} bg-[#7C3AED] text-white rounded-2xl px-6 py-4 group relative`}
      >
        {isPending && (
          <div className="absolute -left-8 top-4 flex items-center gap-1 text-xs text-yellow-400">
            <Clock className="h-3 w-3 animate-spin" />
            <span>Sending...</span>
          </div>
        )}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-white placeholder:text-gray-300 focus:outline-none resize-none"
              rows={Math.max(1, editContent.split('\n').length)}
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveEdit}
                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                title="Save changes"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-invert prose-lg max-w-none leading-relaxed pr-12">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children, ...props }: any) => (
                    <p className="mb-2 last:mb-0" {...props}>
                      {children}
                    </p>
                  ),
                  strong: ({ children, ...props }: any) => (
                    <strong className="font-semibold text-white" {...props}>
                      {children}
                    </strong>
                  ),
                  em: ({ children, ...props }: any) => (
                    <em className="italic text-gray-200" {...props}>
                      {children}
                    </em>
                  ),
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = inline || (!match && !String(children).includes('\n'));
                    if (isInline) {
                      return (
                        <code
                          className="bg-gray-800 text-green-400 px-1.5 py-0.5 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <CodeBlock
                        code={String(children).replace(/\n$/, '')}
                        language={match ? match[1] : undefined}
                      />
                    );
                  },
                  pre: ({ children }: any) => <>{children}</>,
                  ul: ({ children, ...props }: any) => (
                    <ul className="list-disc list-inside mb-2 space-y-1" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }: any) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }: any) => (
                    <li className="text-gray-200" {...props}>
                      {children}
                    </li>
                  ),
                }}
              >
                {typeof message.content === 'string'
                  ? message.content
                  : JSON.stringify(message.content, null, 2)}
              </ReactMarkdown>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className="p-1 text-gray-300 hover:text-white transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleEdit}
                className="p-1 text-gray-300 hover:text-white transition-colors"
                title="Edit message"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              {onReply && (
                <button
                  onClick={() => onReply(message.id)}
                  className="p-1 text-gray-300 hover:text-white transition-colors"
                  title="Reply in thread"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {replyBadge}
    </div>
  );
}
