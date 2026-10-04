/**
 * Service Fallback Manager (#926)
 * Handles degraded third-party services for Prompt Hash Stellar.
 * Emits observability events and enforces fallback behaviors and action blocking.
 */

import { logger } from '@/utils/logger';

export type ServiceId = 'STELLAR_HORIZON' | 'AI_AGENT_SERVICE' | 'MARKETPLACE_API' | 'IPFS_GATEWAY';

export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'RECOVERY';

export type CriticalAction =
  | 'PUBLISH_PROMPT_HASH'
  | 'EXECUTE_STELLAR_PAYMENT'
  | 'QUERY_AI_AGENT'
  | 'FETCH_MARKETPLACE_LISTINGS';

export interface ObservabilityEvent {
  service: ServiceId;
  previousStatus: ServiceStatus;
  newStatus: ServiceStatus;
  reason?: string;
  timestamp: string;
  fallbackModeActive: boolean;
}

export type ObservabilityListener = (event: ObservabilityEvent) => void;

class ServiceFallbackManager {
  private serviceStates: Map<ServiceId, ServiceStatus> = new Map([
    ['STELLAR_HORIZON', 'HEALTHY'],
    ['AI_AGENT_SERVICE', 'HEALTHY'],
    ['MARKETPLACE_API', 'HEALTHY'],
    ['IPFS_GATEWAY', 'HEALTHY'],
  ]);

  private listeners: Set<ObservabilityListener> = new Set();
  private eventHistory: ObservabilityEvent[] = [];

  /**
   * Set the status of a third-party service and trigger observability events.
   */
  setServiceStatus(service: ServiceId, newStatus: ServiceStatus, reason?: string): void {
    const previousStatus = this.serviceStates.get(service) || 'HEALTHY';
    if (previousStatus === newStatus) return;

    this.serviceStates.set(service, newStatus);

    const event: ObservabilityEvent = {
      service,
      previousStatus,
      newStatus,
      reason: reason || `Service state changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
      fallbackModeActive: newStatus !== 'HEALTHY',
    };

    this.eventHistory.push(event);
    logger.warn(`[FallbackManager] Service ${service} transitioned from ${previousStatus} to ${newStatus}: ${event.reason}`);

    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        logger.error('[FallbackManager] Listener execution error:', err);
      }
    });
  }

  /**
   * Get current status for a service.
   */
  getServiceStatus(service: ServiceId): ServiceStatus {
    return this.serviceStates.get(service) || 'HEALTHY';
  }

  /**
   * Check if a critical user action is allowed under current service conditions.
   */
  isActionAllowed(action: CriticalAction): { allowed: boolean; reason?: string } {
    switch (action) {
      case 'PUBLISH_PROMPT_HASH': {
        const horizon = this.getServiceStatus('STELLAR_HORIZON');
        const ipfs = this.getServiceStatus('IPFS_GATEWAY');
        if (horizon === 'UNAVAILABLE') {
          return { allowed: false, reason: 'Stellar Horizon network is unavailable. Publishing prompt hash is temporarily disabled to protect your account.' };
        }
        if (ipfs === 'UNAVAILABLE') {
          return { allowed: false, reason: 'IPFS storage gateway is unavailable. Cannot pin prompt metadata.' };
        }
        return { allowed: true };
      }

      case 'EXECUTE_STELLAR_PAYMENT': {
        const horizon = this.getServiceStatus('STELLAR_HORIZON');
        if (horizon === 'UNAVAILABLE') {
          return { allowed: false, reason: 'Stellar network is currently unavailable. Payment transactions are blocked to prevent funds loss.' };
        }
        return { allowed: true };
      }

      case 'QUERY_AI_AGENT': {
        const agent = this.getServiceStatus('AI_AGENT_SERVICE');
        if (agent === 'UNAVAILABLE') {
          return { allowed: false, reason: 'AI Agent service is offline. Query processing is temporarily paused.' };
        }
        return { allowed: true };
      }

      case 'FETCH_MARKETPLACE_LISTINGS': {
        const market = this.getServiceStatus('MARKETPLACE_API');
        if (market === 'UNAVAILABLE') {
          return { allowed: false, reason: 'Marketplace API is unavailable.' };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  /**
   * Get user-safe messaging for a service's current state.
   */
  getFallbackMessage(service: ServiceId): string {
    const status = this.getServiceStatus(service);
    switch (service) {
      case 'STELLAR_HORIZON':
        if (status === 'DEGRADED') {
          return 'Stellar network is degraded. Operating using cached account balance with extended retry backoff.';
        }
        if (status === 'UNAVAILABLE') {
          return 'Stellar network is unavailable. Wallet transactions are temporarily disabled.';
        }
        if (status === 'RECOVERY') {
          return 'Stellar network is recovering. Re-verifying transaction ledger stability.';
        }
        return 'Stellar network operational.';

      case 'AI_AGENT_SERVICE':
        if (status === 'DEGRADED') {
          return 'AI Agent service is in degraded mode. Standard rule-based fallback responses are active.';
        }
        if (status === 'UNAVAILABLE') {
          return 'AI Agent service is unavailable. Prompt evaluation paused.';
        }
        if (status === 'RECOVERY') {
          return 'AI Agent service is recovering. Testing prompt model connectivity.';
        }
        return 'AI Agent service operational.';

      case 'MARKETPLACE_API':
        if (status === 'DEGRADED') {
          return 'Marketplace API is operating in degraded mode. Serving cached prompt listings.';
        }
        if (status === 'UNAVAILABLE') {
          return 'Marketplace API is unavailable. Live marketplace operations paused.';
        }
        return 'Marketplace operational.';

      case 'IPFS_GATEWAY':
        if (status === 'DEGRADED') {
          return 'IPFS gateway is degraded. Using local metadata cache.';
        }
        if (status === 'UNAVAILABLE') {
          return 'IPFS gateway is unavailable. Prompt metadata pinning is paused.';
        }
        return 'IPFS gateway operational.';

      default:
        return 'Service status normal.';
    }
  }

  /**
   * Subscribe to status change events for observability telemetry.
   */
  subscribe(listener: ObservabilityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get recorded observability events history.
   */
  getEventHistory(): ObservabilityEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Reset all service states back to HEALTHY (useful in testing/recovery).
   */
  resetAll(): void {
    this.serviceStates.forEach((_, key) => {
      this.serviceStates.set(key, 'HEALTHY');
    });
    this.eventHistory = [];
    this.listeners.clear();
  }
}

export const serviceFallbackManager = new ServiceFallbackManager();
export default serviceFallbackManager;
