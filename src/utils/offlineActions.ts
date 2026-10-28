/**
 * Which operations may be held while the device is offline and replayed once
 * connectivity returns (#280).
 *
 * Replaying a request later is only safe when running it twice, or running it
 * long after the user decided to, cannot move funds or sign anything. So the
 * queue is an allowlist: an action kind is queueable only when it is listed in
 * `QUEUEABLE_OFFLINE_ACTIONS`. Everything else, including every payment and
 * signing action, is refused by default and must be retried by the user while
 * online.
 */
export type OfflineActionKind =
  | 'chat_message'
  | 'payment'
  | 'transaction_signing'
  | 'wallet_connection'
  | 'contact_mutation'
  | 'account_change';

/** The only operations that may be queued offline. Add to this list deliberately. */
export const QUEUEABLE_OFFLINE_ACTIONS: readonly OfflineActionKind[] = ['chat_message'];

const REFUSAL_REASONS: Record<OfflineActionKind, string> = {
  chat_message: '',
  payment: 'Payments are not queued offline. Reconnect and send the payment again.',
  transaction_signing: 'Signing is not queued offline. Reconnect and sign again.',
  wallet_connection: 'Wallet connections are not queued offline. Reconnect and try again.',
  contact_mutation: 'Contact changes are not queued offline. Reconnect and try again.',
  account_change: 'Account changes are not queued offline. Reconnect and try again.',
};

/** True only for kinds on the explicit allowlist. Unknown kinds are not queueable. */
export function isQueueableOfflineAction(kind: string): kind is OfflineActionKind {
  return (QUEUEABLE_OFFLINE_ACTIONS as readonly string[]).includes(kind);
}

/** The message to show when `kind` was refused, or `null` when it may be queued. */
export function offlineQueueRefusal(kind: string): string | null {
  if (isQueueableOfflineAction(kind)) return null;
  return (
    (REFUSAL_REASONS as Record<string, string | undefined>)[kind] ??
    'This action is not queued offline. Reconnect and try again.'
  );
}
