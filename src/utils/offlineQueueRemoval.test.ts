import { describe, expect, it, vi } from 'vitest';
import {
  DISCARD_CONFIRMATION,
  confirmQueueRemoval,
  removeQueueItem,
  shouldConfirmRemoval,
} from './offlineQueueRemoval';

describe('single offline queue item removal (#548)', () => {
  it('confirms only when discarding non-empty text', () => {
    const confirm = vi.fn(() => true);

    expect(shouldConfirmRemoval('hello')).toBe(true);
    expect(confirmQueueRemoval('hello', confirm)).toBe(true);
    expect(confirm).toHaveBeenCalledWith(DISCARD_CONFIRMATION);

    confirm.mockClear();
    expect(shouldConfirmRemoval('   ')).toBe(false);
    expect(confirmQueueRemoval('   ', confirm)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('does not remove anything when confirmation is declined', () => {
    expect(confirmQueueRemoval('hello', () => false)).toBe(false);
  });

  it('removes only the selected item without mutating the source queue', () => {
    const queue = [
      { id: 'q1', query: 'first' },
      { id: 'q2', query: 'second' },
      { id: 'q3', query: 'third' },
    ];

    expect(removeQueueItem(queue, 'q2')).toEqual([queue[0], queue[2]]);
    expect(queue).toHaveLength(3);
    expect(removeQueueItem(queue, 'missing')).toEqual(queue);
  });
});
