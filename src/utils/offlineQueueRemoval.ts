/**
 * Single-item offline queue removal (#548).
 *
 * Only the selected row is removed; the persisted queue is updated through the
 * existing `dequeueMessage` reducer, which saves the remaining entries back to
 * localStorage. Non-empty text requires an explicit confirmation so a user
 * cannot accidentally discard real work.
 */

export const DISCARD_CONFIRMATION = 'Discard this unsent message? This cannot be undone.';

export function shouldConfirmRemoval(query: string): boolean {
  return query.trim().length > 0;
}

export function confirmQueueRemoval(
  query: string,
  confirm: (message: string) => boolean,
): boolean {
  return shouldConfirmRemoval(query) ? confirm(DISCARD_CONFIRMATION) : true;
}

export function removeQueueItem<T extends { id: string }>(
  queue: ReadonlyArray<T>,
  id: string,
): T[] {
  return queue.filter((item) => item.id !== id);
}
