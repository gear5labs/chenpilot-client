// Format utility functions for the ChenPilot client
import type { ChatMessage, ExecutionTrace, ExecutionStep } from '@/types';

/**
 * Format a Starknet address for display
 * @param address - The full Starknet address
 * @param startChars - Number of characters to show at the start (default: 6)
 * @param endChars - Number of characters to show at the end (default: 4)
 * @returns Formatted address string
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length < startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a token amount for display
 * @param amount - The amount as a string
 * @param decimals - Number of decimal places to show (default: 4)
 * @param tokenSymbol - Token symbol to append (optional)
 * @returns Formatted amount string
 */
export function formatTokenAmount(amount: string | number, decimals: number = 4, tokenSymbol?: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0';
  }

  const formatted = numAmount.toFixed(decimals);
  const trimmed = parseFloat(formatted).toString();
  
  return tokenSymbol ? `${trimmed} ${tokenSymbol}` : trimmed;
}

/**
 * Format a large number with appropriate suffixes (K, M, B)
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export function formatLargeNumber(num: number, decimals: number = 1): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  return num.toString();
}

/**
 * Format a date for display
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format a relative time (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a transaction hash for display
 * @param hash - The transaction hash
 * @param startChars - Number of characters to show at the start (default: 8)
 * @param endChars - Number of characters to show at the end (default: 8)
 * @returns Formatted hash string
 */
export function formatTransactionHash(hash: string, startChars: number = 8, endChars: number = 8): string {
  if (!hash || hash.length < startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format a percentage for display
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a file size in bytes to human readable format
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Capitalize the first letter of a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 * @param str - The string to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Truncate text to a specified length
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the text
 * @param suffix - Suffix to add when truncating (default: '...')
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Format an individual execution step into Markdown
 */
function formatExecutionStepMarkdown(step: ExecutionStep, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const typeTag = step.type ? `[${step.type}]` : '';
  const duration = typeof step.duration === 'number' ? ` (${step.duration}ms)` : '';
  const desc = step.description ? `: ${step.description}` : '';
  let line = `${indent}- **${typeTag} ${step.name || 'Step'}**${duration}${desc}`;

  if (step.details !== undefined && step.details !== null) {
    const detailsStr = typeof step.details === 'string'
      ? step.details
      : JSON.stringify(step.details, null, 2);
    line += `\n${indent}  \`\`\`json\n${detailsStr.split('\n').map((l) => `${indent}  ${l}`).join('\n')}\n${indent}  \`\`\``;
  }

  if (step.substeps && step.substeps.length > 0) {
    const substepsLines = step.substeps.map((sub) => formatExecutionStepMarkdown(sub, indentLevel + 1)).join('\n');
    line += `\n${substepsLines}`;
  }

  return line;
}

/**
 * Format execution trace summary into Markdown
 */
function formatExecutionTraceMarkdown(trace: ExecutionTrace): string {
  const parts: string[] = ['### Execution Trace Summary'];
  if (typeof trace.totalTime === 'number') {
    parts.push(`- **Total Duration:** ${trace.totalTime}ms`);
  }
  if (trace.startTime) {
    parts.push(`- **Start Time:** ${trace.startTime}`);
  }
  if (trace.endTime) {
    parts.push(`- **End Time:** ${trace.endTime}`);
  }
  if (trace.steps && trace.steps.length > 0) {
    parts.push(`- **Steps (${trace.steps.length}):**`);
    for (const step of trace.steps) {
      parts.push(formatExecutionStepMarkdown(step, 1));
    }
  }
  return parts.join('\n');
}

/**
 * Check whether chat messages array has non-empty exportable content
 */
export function isChatEmpty(messages?: ChatMessage[] | null): boolean {
  if (!messages || messages.length === 0) {
    return true;
  }
  return !messages.some(
    (m) => (typeof m.content === 'string' ? m.content.trim().length > 0 : Boolean(m.content)) || Boolean(m.metadata)
  );
}

/**
 * Serialize chat messages into Markdown format with role headers, ISO timestamps,
 * and fenced code blocks for structured content (plus execution trace summaries).
 */
export function serializeChatToMarkdown(messages: ChatMessage[]): string {
  if (isChatEmpty(messages)) {
    return '';
  }

  const formattedMessages = messages.map((message) => {
    const role = capitalize(message.type || 'unknown');
    let isoTimestamp: string;
    try {
      const d = message.timestamp ? new Date(message.timestamp) : new Date();
      isoTimestamp = !isNaN(d.getTime()) ? d.toISOString() : String(message.timestamp);
    } catch {
      isoTimestamp = String(message.timestamp || '');
    }

    const lines: string[] = [
      `## ${role}`,
      `*Timestamp: ${isoTimestamp}*`,
      ''
    ];

    // Structured or string content
    if (typeof message.content === 'object' && message.content !== null) {
      lines.push('```json');
      lines.push(JSON.stringify(message.content, null, 2));
      lines.push('```');
    } else {
      lines.push(String(message.content ?? ''));
    }

    // Structured metadata & execution trace
    if (message.metadata) {
      const { executionTrace, ...restMetadata } = message.metadata;
      if (Object.keys(restMetadata).length > 0) {
        lines.push('');
        lines.push('### Metadata');
        lines.push('```json');
        lines.push(JSON.stringify(restMetadata, null, 2));
        lines.push('```');
      }

      if (executionTrace) {
        lines.push('');
        lines.push(formatExecutionTraceMarkdown(executionTrace));
      }
    }

    return lines.join('\n');
  });

  return formattedMessages.join('\n\n---\n\n');
}

export const exportChatToMarkdown = serializeChatToMarkdown;

/**
 * Serialize chat messages into JSON format bi-directionally without losing metadata.
 * Returns empty string if chat messages are empty.
 */
export function serializeChatToJson(messages: ChatMessage[]): string {
  if (isChatEmpty(messages)) {
    return '';
  }
  return JSON.stringify(messages, null, 2);
}

export const exportChatToJson = serializeChatToJson;

/**
 * Deserialize JSON back into ChatMessage[] without loss of fields.
 */
export function deserializeChatFromJson(jsonStr: string): ChatMessage[] {
  if (!jsonStr || !jsonStr.trim() || jsonStr.trim() === '[]') {
    return [];
  }
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse chat JSON:', error);
    return [];
  }
}

export const parseChatFromJson = deserializeChatFromJson;

/**
 * Generate a deterministic filename using the pattern:
 * chenpilot-conversation-<id>-<date>.md (or .json)
 */
export function generateChatExportFilename(
  conversationId?: string | null,
  format: 'md' | 'json' | string = 'md',
  date: Date | string = new Date()
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = !isNaN(d.getTime())
    ? d.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const idStr = conversationId && conversationId.trim() ? conversationId.trim() : 'active';
  const ext = format.toLowerCase().includes('json') ? 'json' : 'md';
  return `chenpilot-conversation-${idStr}-${dateStr}.${ext}`;
}

/**
 * Trigger blob download programmatically in browser environments.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined') return;

  const createObjectURL = window.URL?.createObjectURL || (() => '');
  const revokeObjectURL = window.URL?.revokeObjectURL || (() => {});
  const url = createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('data-testid', 'export-download-link');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (url) {
    revokeObjectURL(url);
  }
}

/**
 * Helper to export chat messages as file download
 */
export function exportChatMessages(
  messages: ChatMessage[],
  format: 'md' | 'json',
  conversationId?: string | null,
  date?: Date | string
): { success: boolean; filename?: string; content?: string } {
  if (isChatEmpty(messages)) {
    return { success: false };
  }

  const content = format === 'json' ? serializeChatToJson(messages) : serializeChatToMarkdown(messages);
  if (!content) {
    return { success: false };
  }

  const filename = generateChatExportFilename(conversationId, format, date);
  const mimeType = format === 'json' ? 'application/json' : 'text/markdown';
  const blob = new Blob([content], { type: mimeType });

  triggerBlobDownload(blob, filename);
  return { success: true, filename, content };
}

