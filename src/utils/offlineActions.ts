/** The only operations that may be queued offline. Add to this list deliberately. */
export const QUEUEABLE_OFFLINE_ACTIONS: readonly OfflineActionKind[] = ['chat_message'];

/** True only for kinds on the explicit allowlist. Unknown kinds are not queueable. */
export function isQueueableOfflineAction(kind: string): kind is OfflineActionKind {
  return (QUEUEABLE_OFFLINE_ACTIONS as readonly string[]).includes(kind);
}

export type OfflineActionKind = 'chat_message' | 'payment' | 'signing' | 'send_payment' | 'deploy_contract' | 'contact_update' | string;

export const offlineQueueRefusal = (kind: OfflineActionKind): string | null => {
  switch (kind) {
    case 'chat_message':
      return null;
    case 'payment':
    case 'send_payment':
      return 'Payments cannot be queued offline. Please reconnect to send payments.';
    case 'signing':
      return 'Signing operations cannot be queued offline.';
    case 'deploy_contract':
      return 'Contract deployment cannot be queued offline.';
    case 'contact_update':
      return 'Contact updates cannot be queued offline.';
    default:
      return `Action kind "${kind}" is not supported for offline queueing.`;
  }
};
