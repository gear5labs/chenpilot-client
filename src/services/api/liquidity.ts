import { ApiClient, apiClient } from './client';
import { LiquidityStats, LiquidityRequest, ApiResponse } from '@/types';

export class LiquidityApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  async getLiquidityStats(
    request?: LiquidityRequest,
  ): Promise<ApiResponse<LiquidityStats>> {
    const response = await this.client.api.post<
      ApiResponse<LiquidityStats>
    >('/liquidity', request || {});

    return response.data;
  }
}

export const liquidityApi = new LiquidityApi();
