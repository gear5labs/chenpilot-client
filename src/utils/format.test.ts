import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  serializeChatToMarkdown,
  exportChatToMarkdown,
  serializeChatToJson,
  exportChatToJson,
  deserializeChatFromJson,
  parseChatFromJson,
  generateChatExportFilename,
  isChatEmpty,
  triggerBlobDownload,
  exportChatMessages,
} from './format';
import type { ChatMessage } from '@/types';

describe('format.ts chat export utilities', () => {
  const sampleDate = new Date('2026-09-29T12:00:00.000Z');

  const textOnlyMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      type: 'user',
      content: 'Hello, what is my wallet balance?',
      timestamp: '2026-09-29T10:00:00.000Z',
    },
    {
      id: 'msg-2',
      type: 'agent',
      content: 'Your wallet balance is 250.50 XLM.',
      timestamp: '2026-09-29T10:00:02.000Z',
    },
  ];

  const structuredAndTraceMessages: ChatMessage[] = [
    {
      id: 'msg-user-1',
      type: 'user',
      content: 'Show me available liquidity pools',
      timestamp: '2026-09-29T11:00:00.000Z',
    },
    {
      id: 'msg-agent-1',
      type: 'agent',
      content: {
        pools: [
          { pair: 'XLM/USDC', tvl: '$1,200,000', apy: '7.5%' },
          { pair: 'AQUA/XLM', tvl: '$850,000', apy: '12.3%' },
        ],
      } as unknown as string,
      timestamp: '2026-09-29T11:00:03.000Z',
      metadata: {
        tokenType: 'XLM',
        status: 'success',
        action: 'query_pools',
        executionTrace: {
          totalTime: 320,
          startTime: '2026-09-29T11:00:01.000Z',
          endTime: '2026-09-29T11:00:01.320Z',
          steps: [
            {
              id: 'step-1',
              name: 'Parse Query',
              type: 'thought',
              timestamp: '2026-09-29T11:00:01.000Z',
              duration: 20,
              description: 'Identified request for liquidity pool data',
            },
            {
              id: 'step-2',
              name: 'Fetch Soroswap Pools',
              type: 'tool_call',
              timestamp: '2026-09-29T11:00:01.020Z',
              duration: 300,
              description: 'Retrieved pool statistics from Soroswap API',
              details: {
                endpoint: '/api/v1/pools',
                status: 200,
              },
              substeps: [
                {
                  id: 'substep-2-1',
                  name: 'Filter active pools',
                  type: 'action',
                  timestamp: '2026-09-29T11:00:01.250Z',
                  duration: 50,
                  description: 'Filtered pools by minimum TVL threshold',
                },
              ],
            },
          ],
        },
      },
    },
  ];

  describe('isChatEmpty', () => {
    it('returns true for undefined, null, or empty array', () => {
      expect(isChatEmpty()).toBe(true);
      expect(isChatEmpty(null)).toBe(true);
      expect(isChatEmpty([])).toBe(true);
    });

    it('returns true when all messages have blank content and no metadata', () => {
      const blankMessages: ChatMessage[] = [
        { id: '1', type: 'user', content: '', timestamp: '2026-09-29T10:00:00.000Z' },
        { id: '2', type: 'agent', content: '   ', timestamp: '2026-09-29T10:00:01.000Z' },
      ];
      expect(isChatEmpty(blankMessages)).toBe(true);
    });

    it('returns false when at least one message has content or metadata', () => {
      expect(isChatEmpty(textOnlyMessages)).toBe(false);
      const metadataOnlyMessage: ChatMessage[] = [
        {
          id: '1',
          type: 'system',
          content: '',
          timestamp: '2026-09-29T10:00:00.000Z',
          metadata: { status: 'success' },
        },
      ];
      expect(isChatEmpty(metadataOnlyMessage)).toBe(false);
    });
  });

  describe('serializeChatToMarkdown', () => {
    it('handles empty chat gracefully by returning an empty string', () => {
      expect(serializeChatToMarkdown([])).toBe('');
      expect(serializeChatToMarkdown(null as unknown as ChatMessage[])).toBe('');
      expect(exportChatToMarkdown([])).toBe('');
    });

    it('serializes text-only messages with role headers and ISO timestamps', () => {
      const result = serializeChatToMarkdown(textOnlyMessages);

      expect(result).toContain('## User');
      expect(result).toContain('*Timestamp: 2026-09-29T10:00:00.000Z*');
      expect(result).toContain('Hello, what is my wallet balance?');

      expect(result).toContain('## Agent');
      expect(result).toContain('*Timestamp: 2026-09-29T10:00:02.000Z*');
      expect(result).toContain('Your wallet balance is 250.50 XLM.');

      expect(result).toContain('\n\n---\n\n');
    });

    it('serializes structured content with fenced code blocks and execution trace summary', () => {
      const result = serializeChatToMarkdown(structuredAndTraceMessages);

      // Role header & timestamp
      expect(result).toContain('## Agent');
      expect(result).toContain('*Timestamp: 2026-09-29T11:00:03.000Z*');

      // Fenced code block for structured object content
      expect(result).toContain('```json');
      expect(result).toContain('"pair": "XLM/USDC"');
      expect(result).toContain('"tvl": "$1,200,000"');

      // Metadata block
      expect(result).toContain('### Metadata');
      expect(result).toContain('"tokenType": "XLM"');
      expect(result).toContain('"status": "success"');

      // Execution trace summary
      expect(result).toContain('### Execution Trace Summary');
      expect(result).toContain('- **Total Duration:** 320ms');
      expect(result).toContain('- **Start Time:** 2026-09-29T11:00:01.000Z');
      expect(result).toContain('- **End Time:** 2026-09-29T11:00:01.320Z');
      expect(result).toContain('- **[thought] Parse Query** (20ms): Identified request for liquidity pool data');
      expect(result).toContain('- **[tool_call] Fetch Soroswap Pools** (300ms): Retrieved pool statistics from Soroswap API');

      // Fenced code block for step details
      expect(result).toContain('"endpoint": "/api/v1/pools"');

      // Substeps
      expect(result).toContain('- **[action] Filter active pools** (50ms): Filtered pools by minimum TVL threshold');
    });

    it('matches snapshot for complete conversation with execution trace and structured content', () => {
      const markdown = serializeChatToMarkdown([
        ...textOnlyMessages,
        ...structuredAndTraceMessages,
      ]);
      expect(markdown).toMatchSnapshot();
    });
  });

  describe('serializeChatToJson & deserializeChatFromJson', () => {
    it('returns empty string for empty chat', () => {
      expect(serializeChatToJson([])).toBe('');
      expect(exportChatToJson([])).toBe('');
    });

    it('deserializes empty string or empty array JSON to empty array', () => {
      expect(deserializeChatFromJson('')).toEqual([]);
      expect(deserializeChatFromJson('   ')).toEqual([]);
      expect(deserializeChatFromJson('[]')).toEqual([]);
      expect(parseChatFromJson('')).toEqual([]);
    });

    it('handles malformed JSON gracefully', () => {
      expect(deserializeChatFromJson('{ malformed json')).toEqual([]);
    });

    it('serializes and deserializes bi-directionally without losing metadata fields', () => {
      const fullMessages: ChatMessage[] = [
        ...textOnlyMessages,
        ...structuredAndTraceMessages,
      ];

      const jsonStr = serializeChatToJson(fullMessages);
      expect(typeof jsonStr).toBe('string');
      expect(jsonStr.length).toBeGreaterThan(0);

      const deserialized = deserializeChatFromJson(jsonStr);
      expect(deserialized).toEqual(fullMessages);

      // Verify specific metadata fields survive round-trip intact
      const agentMsg = deserialized.find((m) => m.id === 'msg-agent-1');
      expect(agentMsg).toBeDefined();
      expect(agentMsg?.metadata?.tokenType).toBe('XLM');
      expect(agentMsg?.metadata?.status).toBe('success');
      expect(agentMsg?.metadata?.executionTrace?.totalTime).toBe(320);
      expect(agentMsg?.metadata?.executionTrace?.steps).toHaveLength(2);
      expect(agentMsg?.metadata?.executionTrace?.steps[1].substeps).toHaveLength(1);
    });
  });

  describe('generateChatExportFilename', () => {
    it('generates deterministic markdown filename matching pattern', () => {
      const filename = generateChatExportFilename('conv_123', 'md', sampleDate);
      expect(filename).toBe('chenpilot-conversation-conv_123-2026-09-29.md');
    });

    it('generates deterministic json filename matching pattern', () => {
      const filename = generateChatExportFilename('conv_123', 'json', sampleDate);
      expect(filename).toBe('chenpilot-conversation-conv_123-2026-09-29.json');
    });

    it('handles missing or empty conversation id gracefully', () => {
      const filename = generateChatExportFilename('', 'md', sampleDate);
      expect(filename).toBe('chenpilot-conversation-active-2026-09-29.md');

      const nullIdFilename = generateChatExportFilename(null, 'json', sampleDate);
      expect(nullIdFilename).toBe('chenpilot-conversation-active-2026-09-29.json');
    });
  });

  describe('triggerBlobDownload & exportChatMessages', () => {
    let originalCreateObjectURL: typeof window.URL.createObjectURL;
    let originalRevokeObjectURL: typeof window.URL.revokeObjectURL;
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:http://localhost/test-url');
      mockRevokeObjectURL = vi.fn();
      originalCreateObjectURL = window.URL.createObjectURL;
      originalRevokeObjectURL = window.URL.revokeObjectURL;
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;

      appendChildSpy = vi.spyOn(document.body, 'appendChild');
      removeChildSpy = vi.spyOn(document.body, 'removeChild');
    });

    afterEach(() => {
      window.URL.createObjectURL = originalCreateObjectURL;
      window.URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('does not trigger download when chat is empty', () => {
      const result = exportChatMessages([], 'md', 'conv_123');
      expect(result.success).toBe(false);
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it('triggers blob download with markdown content and correct filename', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const result = exportChatMessages(textOnlyMessages, 'md', 'conv_123', sampleDate);
      expect(result.success).toBe(true);
      expect(result.filename).toBe('chenpilot-conversation-conv_123-2026-09-29.md');
      expect(result.content).toContain('## User');

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const passedBlob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(passedBlob.type).toBe('text/markdown');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-url');
    });

    it('triggers blob download with JSON content and correct filename', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      const result = exportChatMessages(textOnlyMessages, 'json', 'conv_456', sampleDate);
      expect(result.success).toBe(true);
      expect(result.filename).toBe('chenpilot-conversation-conv_456-2026-09-29.json');
      expect(result.content).toBe(JSON.stringify(textOnlyMessages, null, 2));

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      const passedBlob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(passedBlob.type).toBe('application/json');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-url');
    });

    it('direct triggerBlobDownload creates link and triggers click', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const blob = new Blob(['test direct download'], { type: 'text/plain' });

      triggerBlobDownload(blob, 'test-file.txt');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(removeChildSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-url');
    });
  });
});
