import { describe, it, expect, beforeEach, vi } from 'vitest';
import serviceFallbackManager from '../serviceFallbackManager';

describe('ServiceFallbackManager (#926)', () => {
  beforeEach(() => {
    serviceFallbackManager.resetAll();
  });

  it('defaults all third-party services to HEALTHY status', () => {
    expect(serviceFallbackManager.getServiceStatus('STELLAR_HORIZON')).toBe('HEALTHY');
    expect(serviceFallbackManager.getServiceStatus('AI_AGENT_SERVICE')).toBe('HEALTHY');
    expect(serviceFallbackManager.getServiceStatus('MARKETPLACE_API')).toBe('HEALTHY');
    expect(serviceFallbackManager.getServiceStatus('IPFS_GATEWAY')).toBe('HEALTHY');
  });

  it('allows critical actions when services are HEALTHY', () => {
    expect(serviceFallbackManager.isActionAllowed('PUBLISH_PROMPT_HASH').allowed).toBe(true);
    expect(serviceFallbackManager.isActionAllowed('EXECUTE_STELLAR_PAYMENT').allowed).toBe(true);
    expect(serviceFallbackManager.isActionAllowed('QUERY_AI_AGENT').allowed).toBe(true);
    expect(serviceFallbackManager.isActionAllowed('FETCH_MARKETPLACE_LISTINGS').allowed).toBe(true);
  });

  it('triggers degraded mode fallback behavior and messaging', () => {
    serviceFallbackManager.setServiceStatus('STELLAR_HORIZON', 'DEGRADED', 'High latency detected');

    expect(serviceFallbackManager.getServiceStatus('STELLAR_HORIZON')).toBe('DEGRADED');
    expect(serviceFallbackManager.getFallbackMessage('STELLAR_HORIZON')).toContain('cached account balance');
  });

  it('blocks critical unsafe actions when dependency is UNAVAILABLE', () => {
    serviceFallbackManager.setServiceStatus('STELLAR_HORIZON', 'UNAVAILABLE', 'Connection timeout');

    const paymentCheck = serviceFallbackManager.isActionAllowed('EXECUTE_STELLAR_PAYMENT');
    expect(paymentCheck.allowed).toBe(false);
    expect(paymentCheck.reason).toContain('Stellar network is currently unavailable');

    const publishCheck = serviceFallbackManager.isActionAllowed('PUBLISH_PROMPT_HASH');
    expect(publishCheck.allowed).toBe(false);
    expect(publishCheck.reason).toContain('Stellar Horizon network is unavailable');
  });

  it('emits observability events when status changes', () => {
    const listenerMock = vi.fn();
    serviceFallbackManager.subscribe(listenerMock);

    serviceFallbackManager.setServiceStatus('AI_AGENT_SERVICE', 'DEGRADED', 'Model rate limited');

    expect(listenerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        service: 'AI_AGENT_SERVICE',
        previousStatus: 'HEALTHY',
        newStatus: 'DEGRADED',
        reason: 'Model rate limited',
        fallbackModeActive: true,
      })
    );

    const history = serviceFallbackManager.getEventHistory();
    expect(history.length).toBe(1);
    expect(history[0].service).toBe('AI_AGENT_SERVICE');
  });

  it('handles recovery transition state properly', () => {
    serviceFallbackManager.setServiceStatus('STELLAR_HORIZON', 'UNAVAILABLE');
    serviceFallbackManager.setServiceStatus('STELLAR_HORIZON', 'RECOVERY', 'Ledger sync in progress');

    expect(serviceFallbackManager.getServiceStatus('STELLAR_HORIZON')).toBe('RECOVERY');
    expect(serviceFallbackManager.getFallbackMessage('STELLAR_HORIZON')).toContain('recovering');
  });

  it('returns normal status message when fully HEALTHY', () => {
    expect(serviceFallbackManager.getFallbackMessage('IPFS_GATEWAY')).toContain('operational');
  });
});
