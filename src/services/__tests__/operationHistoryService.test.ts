import { describe, it, expect, beforeEach } from 'vitest';
import { OperationHistoryService, OperationEvent } from '../operationHistoryService';

describe('OperationHistoryService (#923)', () => {
  let service: OperationHistoryService;

  const mockEvents: OperationEvent[] = [
    {
      id: 'evt-1',
      userId: 'user-alice',
      action: 'prompt.publish',
      resource: 'prompt-hash-1',
      description: 'Published Prompt Hash #1 to Stellar network',
      status: 'success',
      severity: 'info',
      timestamp: '2026-10-01T10:00:00Z',
      metadata: {
        promptTitle: 'Stellar Smart Contract Helper',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        maintainerNotes: 'Internal maintainer inspection log',
        serverPrivateKey: 'SSECRETKEY12345',
      },
    },
    {
      id: 'evt-2',
      userId: 'user-alice',
      action: 'prompt.buy',
      resource: 'prompt-hash-2',
      description: 'Purchased prompt hash access via Stellar XLM payment',
      status: 'success',
      severity: 'info',
      timestamp: '2026-10-02T12:00:00Z',
      metadata: {
        priceXLM: '50.0',
        internalTrace: 'node_cluster_node_2',
      },
    },
    {
      id: 'evt-3',
      userId: 'user-alice',
      action: 'prompt.delete',
      resource: 'prompt-hash-3',
      description: 'Deleted obsolete prompt hash listing',
      status: 'success',
      severity: 'warning',
      timestamp: '2026-10-03T14:00:00Z',
      isDeleted: true,
      metadata: {},
    },
    {
      id: 'evt-4',
      userId: 'user-bob',
      action: 'prompt.publish',
      resource: 'prompt-hash-4',
      description: 'Bob published prompt',
      status: 'success',
      severity: 'info',
      timestamp: '2026-10-03T15:00:00Z',
      metadata: {},
    },
  ];

  beforeEach(() => {
    service = new OperationHistoryService(mockEvents);
  });

  it('blocks unauthorized access when requesting user differs from target user', () => {
    const result = service.getAuthorizedHistory('user-eve', 'user-alice');
    expect(result.events).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns only authorized operation history for the requesting user', () => {
    const result = service.getAuthorizedHistory('user-alice', 'user-alice');
    // evt-1 and evt-2 (evt-3 is deleted by default)
    expect(result.total).toBe(2);
    expect(result.events.every((e) => e.userId === 'user-alice')).toBe(true);
  });

  it('redacts internal-only and sensitive metadata fields', () => {
    const result = service.getAuthorizedHistory('user-alice', 'user-alice');
    const evt1 = result.events.find((e) => e.id === 'evt-1');

    expect(evt1).toBeDefined();
    expect(evt1?.metadata?.promptTitle).toBe('Stellar Smart Contract Helper');
    expect(evt1?.metadata?.ipAddress).toBeUndefined();
    expect(evt1?.metadata?.userAgent).toBeUndefined();
    expect(evt1?.metadata?.maintainerNotes).toBeUndefined();
    expect(evt1?.metadata?.serverPrivateKey).toBeUndefined();
  });

  it('handles filtering by action, status, and search query', () => {
    const searchResult = service.getAuthorizedHistory('user-alice', 'user-alice', {
      search: 'Purchased prompt',
    });
    expect(searchResult.total).toBe(1);
    expect(searchResult.events[0].id).toBe('evt-2');

    const actionResult = service.getAuthorizedHistory('user-alice', 'user-alice', {
      action: 'prompt.publish',
    });
    expect(actionResult.total).toBe(1);
    expect(actionResult.events[0].id).toBe('evt-1');
  });

  it('handles stable pagination correctly', () => {
    const page1 = service.getAuthorizedHistory('user-alice', 'user-alice', { page: 1, limit: 1 });
    expect(page1.events).toHaveLength(1);
    expect(page1.total).toBe(2);
    expect(page1.totalPages).toBe(2);

    const page2 = service.getAuthorizedHistory('user-alice', 'user-alice', { page: 2, limit: 1 });
    expect(page2.events).toHaveLength(1);
    expect(page2.events[0].id).not.toBe(page1.events[0].id);
  });

  it('excludes soft-deleted records by default and includes them when requested', () => {
    const defaultResult = service.getAuthorizedHistory('user-alice', 'user-alice');
    expect(defaultResult.events.some((e) => e.id === 'evt-3')).toBe(false);

    const withDeleted = service.getAuthorizedHistory('user-alice', 'user-alice', {
      includeDeleted: true,
    });
    expect(withDeleted.events.some((e) => e.id === 'evt-3')).toBe(true);
  });
});
