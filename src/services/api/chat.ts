import { ApiClient, apiClient } from './client';
import {
  AgentQueryRequest,
  AgentQueryResponse,
  ApiResponse,
  ChatHistoryPage,
  ChatHistoryQuery,
  PromptVersionRecord,
} from '@/types';
import type { AgentStatus } from '@/types/agent';
import agentService, {
  classifyAgentError,
  isStateChangingQuery,
  agentErrorMessage,
} from '../agentService';
import { parseAgentEnvelope, protocolErrorResult } from '../agentEnvelope';
import type { MissedEventsPage } from '../socketManager';
import {
  correlationIdForError,
  extractCorrelationId,
  generateCorrelationId,
  logger,
} from '../../utils/logger';

export class ChatApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  /**
   * Fetch chat events emitted after `afterCursor`, oldest first, for post-reconnect resync (#277).
   */
  async getMissedChatEvents(
    afterCursor: string,
    limit = 100,
  ): Promise<MissedEventsPage> {
    const response = await this.client.api.get<MissedEventsPage>('/chat/events', {
      params: { after: afterCursor, limit },
    });
    return {
      events: Array.isArray(response.data?.events) ? response.data.events : [],
      hasMore: Boolean(response.data?.hasMore),
      nextCursor: response.data?.nextCursor,
    };
  }

  /**
   * Send a query to the AI agent. Attempts connected experimental agent service first, falling back to backend `/query`.
   */
  async queryAgent(data: AgentQueryRequest): Promise<AgentQueryResponse>;
  async queryAgent(
    data: AgentQueryRequest,
    options?: { onDelta?: (text: string) => void; signal?: AbortSignal },
  ): Promise<AgentQueryResponse>;
  async queryAgent(
    data: AgentQueryRequest,
    options?: { onDelta?: (text: string) => void; signal?: AbortSignal },
  ): Promise<AgentQueryResponse> {
    const isAbort = (error: unknown): boolean => {
      const value = error as { code?: string; name?: string };

      return (
        value.code === 'ERR_CANCELED' ||
        value.name === 'CanceledError' ||
        value.name === 'AbortError'
      );
    };

    // First try the experimental agent service (streams partial text when supported, #261)
    try {
      if (agentService.isAgentConnected()) {
        logger.debug(
          '[ApiService] Using experimental agent service',
        );

        return await agentService.queryAgentStreaming(data, options ?? {});
      }
    } catch (error: unknown) {
      if (isAbort(error) || options?.signal?.aborted) {
        throw error;
      }

      logger.warn('[ApiService] Experimental agent service failed; falling back to backend:', {
        correlationId: correlationIdForError(error) ?? data.clientRequestId,
        code: (error as { code?: string })?.code,
      });
    }

    try {
      if (!data.query || data.query.trim().length === 0) {
        throw new Error('Query cannot be empty');
      }

      logger.debug('[ApiService] Querying backend /query endpoint');

      const response = await this.client.api.post(
        '/query',
        data,
        { signal: options?.signal },
      );

      const parsed = parseAgentEnvelope(response.data);
      if (!parsed.ok) {
        const correlationId =
          extractCorrelationId(response.headers) ??
          extractCorrelationId(response.config?.headers) ??
          data.clientRequestId ??
          generateCorrelationId('http');
        logger.error('[ApiService] Malformed /query response:', {
          correlationId,
          reason: parsed.reason,
        });
        return {
          result: {
            ...protocolErrorResult(parsed.reason),
            diagnostics: { correlationId },
          },
        };
      }
      const correlationId =
        extractCorrelationId(response.headers) ??
        extractCorrelationId(response.config?.headers) ??
        data.clientRequestId ??
        generateCorrelationId('http');
      return {
        result: {
          ...parsed.result,
          diagnostics: { correlationId },
        },
      };
    } catch (error: unknown) {
      if (isAbort(error)) {
        throw error;
      }

      logger.error('[ApiService] Backend query failed:', {
        correlationId: correlationIdForError(error) ?? data.clientRequestId,
        status: (error as { response?: { status?: number } })?.response?.status,
        code: (error as { code?: string })?.code,
        method: 'POST',
      });

      const errorValue = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      const errorMsg =
        errorValue.response?.data?.message ||
        errorValue.message ||
        'Unknown error';

      const errorKind = classifyAgentError(error);
      const stateChanging = isStateChangingQuery(data.query);
      const friendlyMessage = errorKind === 'server' || errorKind === 'unknown'
        ? 'Query failed. Please try again.'
        : agentErrorMessage(errorKind, stateChanging);

      return {
        result: {
          success: false,
          data: friendlyMessage,
          error: errorMsg,
          errorKind,
          requestId: data.clientRequestId,
          diagnostics: {
            correlationId:
              correlationIdForError(error) ??
              data.clientRequestId ??
              generateCorrelationId('http'),
          },
          stateChanging,
          delivered: Boolean((error as { response?: unknown })?.response),
        },
      };
    }
  }

  async getAgentStatus(): Promise<AgentStatus> {
    try {
      return await agentService.getStatus();
    } catch (error) {
      console.error('Failed to get agent status:', error);
      const unavailable: AgentStatus = {
        isOnline: false,
        source: 'unavailable',
        version: null,
        uptime: null,
        lastActivity: null,
        activeConnections: null,
        services: {},
        health: null,
      };
      return unavailable;
    }
  }

  async getAgentCapabilities() {
    return agentService.getCapabilities();
  }

  async checkAgentHealth() {
    try {
      return await agentService.healthCheck();
    } catch (error) {
      console.error('Failed to check agent health:', error);
      throw error;
    }
  }

  async getAgentTools() {
    try {
      return await agentService.getTools();
    } catch (error) {
      console.error('Failed to get agent tools:', error);
      return [];
    }
  }

  async executeAgentTool(
    toolName: string,
    params: Record<string, unknown>,
  ) {
    try {
      return await agentService.executeTool(toolName, params);
    } catch (error) {
      console.error(
        `Failed to execute agent tool ${toolName}:`,
        error,
      );

      throw error;
    }
  }

  async getAgentMemory(userId: string) {
    return agentService.getMemory(userId);
  }

  async clearAgentMemory(userId: string): Promise<void> {
    try {
      await agentService.clearMemory(userId);
    } catch (error) {
      console.error('Failed to clear agent memory:', error);
      throw error;
    }
  }

  async getChatHistory(query: ChatHistoryQuery = {}): Promise<ChatHistoryPage> {
    const limit = Math.min(Math.max(1, query.limit ?? 50), 100);
    const params: Record<string, string | number> = { limit };
    if (query.before) params.before = query.before;

    const response = await this.client.api.get<ChatHistoryPage>('/chat/history', { params });
    const data = response.data;
    return {
      messages: Array.isArray(data?.messages) ? data.messages : [],
      nextCursor: typeof data?.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null,
      hasMore: Boolean(data?.hasMore && data?.nextCursor),
    };
  }

  async getConversationStats(): Promise<
    ApiResponse<{
      totalConversations: number;
      totalMessages: number;
      activeConversations: number;
    }>
  > {
    const response = await this.client.api.get<
      ApiResponse<{
        totalConversations: number;
        totalMessages: number;
        activeConversations: number;
      }>
    >('/chat/stats');

    return response.data;
  }

  async getPromptVersions(): Promise<
    | PromptVersionRecord[]
    | ApiResponse<PromptVersionRecord[]>
    | PromptVersionRecord
  > {
    const response = await this.client.api.get<
      | PromptVersionRecord[]
      | ApiResponse<PromptVersionRecord[]>
      | PromptVersionRecord
    >('/versions');

    return response.data;
  }

  async activatePromptVersion(
    id: string,
  ): Promise<
    ApiResponse<PromptVersionRecord> | PromptVersionRecord
  > {
    const response = await this.client.api.patch<
      ApiResponse<PromptVersionRecord> | PromptVersionRecord
    >(`/versions/${encodeURIComponent(id)}/activate`);

    return response.data;
  }
}

export const chatApi = new ChatApi();
