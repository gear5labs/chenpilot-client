/**
 * User Operation History Service (#923)
 * Provides user-visible operation history with authorization scoping,
 * stable pagination, filtering, and sensitive detail redaction.
 */

export interface OperationEvent {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  status: 'success' | 'failure' | 'pending';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  metadata?: Record<string, unknown>;
  isDeleted?: boolean;
}

export interface OperationHistoryQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  status?: 'success' | 'failure' | 'pending';
  search?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}

export interface PaginatedOperationHistory {
  events: OperationEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const SENSITIVE_METADATA_KEYS = new Set([
  'ipAddress',
  'userAgent',
  'maintainerNotes',
  'internalMaintainerId',
  'serverPrivateKey',
  'dbConnectionString',
  'rawAuthHeaders',
  'internalTrace',
  'systemCredentials',
  'secretKey',
  'privateKey',
]);

export class OperationHistoryService {
  private eventsStore: OperationEvent[] = [];

  constructor(initialEvents: OperationEvent[] = []) {
    this.eventsStore = [...initialEvents];
  }

  /**
   * Add an operation event to the history store.
   */
  addEvent(event: OperationEvent): void {
    this.eventsStore.push(event);
  }

  /**
   * Redact internal-only and sensitive metadata fields before returning to end-users.
   */
  redactSensitiveDetails(event: OperationEvent): OperationEvent {
    const { ...cleanEvent } = event;

    // Strip top-level internal fields if present
    delete (cleanEvent as any).ipAddress;
    delete (cleanEvent as any).userAgent;

    if (cleanEvent.metadata) {
      const cleanMetadata: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(cleanEvent.metadata)) {
        if (!SENSITIVE_METADATA_KEYS.has(key)) {
          cleanMetadata[key] = val;
        }
      }
      cleanEvent.metadata = cleanMetadata;
    }

    return cleanEvent;
  }

  /**
   * Query operation history with strict authorization, filtering, pagination, and redaction.
   */
  getAuthorizedHistory(
    requestingUserId: string,
    targetUserId: string,
    params: OperationHistoryQueryParams = {}
  ): PaginatedOperationHistory {
    // 1. Authorization check: Users see ONLY their authorized operation history
    if (!requestingUserId || requestingUserId !== targetUserId) {
      return {
        events: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: 0,
      };
    }

    // 2. Filter events owned by the user
    let userEvents = this.eventsStore.filter((e) => e.userId === targetUserId);

    // 3. Handle deleted records: hide soft-deleted records unless explicitly included
    if (!params.includeDeleted) {
      userEvents = userEvents.filter((e) => !e.isDeleted);
    }

    // 4. Filter by Action
    if (params.action) {
      userEvents = userEvents.filter((e) => e.action.toLowerCase() === params.action?.toLowerCase());
    }

    // 5. Filter by Severity
    if (params.severity) {
      userEvents = userEvents.filter((e) => e.severity === params.severity);
    }

    // 6. Filter by Status
    if (params.status) {
      userEvents = userEvents.filter((e) => e.status === params.status);
    }

    // 7. Filter by Search Query
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      userEvents = userEvents.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.resource.toLowerCase().includes(q)
      );
    }

    // 8. Filter by Date Range
    if (params.startDate) {
      const start = new Date(params.startDate).getTime();
      userEvents = userEvents.filter((e) => new Date(e.timestamp).getTime() >= start);
    }
    if (params.endDate) {
      const end = new Date(params.endDate).getTime();
      userEvents = userEvents.filter((e) => new Date(e.timestamp).getTime() <= end);
    }

    // Sort descending by timestamp
    userEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 9. Stable Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const total = userEvents.length;
    const totalPages = Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;
    const paginated = userEvents.slice(startIndex, startIndex + limit);

    // 10. Redact sensitive details from output
    const redactedEvents = paginated.map((e) => this.redactSensitiveDetails(e));

    return {
      events: redactedEvents,
      total,
      page,
      limit,
      totalPages,
    };
  }
}

export const operationHistoryService = new OperationHistoryService();
export default operationHistoryService;
