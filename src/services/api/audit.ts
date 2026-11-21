import { ApiClient, apiClient } from './client';
import {
  AuditLogEntry,
  AuditLogsQueryParams,
  AuditLogsResponse,
  AuditLogStats,
  ApiResponse,
} from '@/types';

export class AuditApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async getAuditLogs(
    params: AuditLogsQueryParams = {},
  ): Promise<AuditLogsResponse> {
    const response = await this.client.api.get<AuditLogsResponse>(
      '/audit',
      { params },
    );

    return response.data;
  }

  async getAuditLogById(
    id: string,
  ): Promise<ApiResponse<AuditLogEntry>> {
    const response = await this.client.api.get<
      ApiResponse<AuditLogEntry>
    >(`/audit/${encodeURIComponent(id)}`);

    return response.data;
  }

  async getAuditLogStats(): Promise<
    ApiResponse<AuditLogStats>
  > {
    const response = await this.client.api.get<
      ApiResponse<AuditLogStats>
    >('/audit/stats');

    return response.data;
  }

  async exportAuditLogs(
    params: AuditLogsQueryParams = {},
  ): Promise<Blob> {
    const response = await this.client.api.get<Blob>('/audit/export', {
      params,
      responseType: 'blob',
    });

    return response.data;
  }
}

export const auditApi = new AuditApi();
