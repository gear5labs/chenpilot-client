import { apiService } from './api';
import { ABTestComparisonResponse } from '@/types';

class AnalyticsService {
  /**
   * Fetches comparison metrics for two specific prompt IDs.
   * Endpoint: GET /compare/:id1/:id2
   */
  async getComparisonData(id1: string, id2: string): Promise<ABTestComparisonResponse> {
    try {
      const response = await apiService.request<ABTestComparisonResponse>({
        method: 'GET',
        url: `/compare/${id1}/${id2}`,
      });
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch comparison data');
      }
      
      return response;
    } catch (error) {
      console.error('[AnalyticsService] Error fetching comparison data:', error);
      throw error;
    }
  }

  /**
   * Fetches historical performance data for a prompt.
   * (Optional addition for future use)
   */
  async getPromptHistory(id: string) {
    try {
      const response = await apiService.request<any>({
        method: 'GET',
        url: `/analytics/prompt/${id}/history`,
      });
      return response.data;
    } catch (error) {
      console.error(`[AnalyticsService] Error fetching history for prompt ${id}:`, error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
