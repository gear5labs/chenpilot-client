'use client';

import { useEffect } from 'react';
import toast, { useToasterStore } from 'react-hot-toast';

export const MAX_VISIBLE_TOASTS = 3;
const OVERFLOW_TOAST_ID = 'toast-overflow-summary';

export function getOverflowToastCount(visibleCount: number, limit = MAX_VISIBLE_TOASTS) {
  return Math.max(0, visibleCount - (limit - 1));
}

export function ToastOverflowManager() {
  const { toasts } = useToasterStore();

  useEffect(() => {
    const visible = toasts.filter((item) => item.visible && item.id !== OVERFLOW_TOAST_ID);
    const overflowCount = getOverflowToastCount(visible.length);
    if (overflowCount === 0) return;

    visible.slice(0, overflowCount).forEach((item) => toast.dismiss(item.id));
    toast.custom(
      (item) => (
        <div className="flex items-center gap-3">
          <span>{overflowCount} earlier notification{overflowCount === 1 ? '' : 's'} hidden</span>
          <button
            type="button"
            aria-label="Dismiss notification summary"
            onClick={() => toast.dismiss(item.id)}
            className="rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          >
            Dismiss
          </button>
        </div>
      ),
      { id: OVERFLOW_TOAST_ID, duration: 5000 },
    );
  }, [toasts]);

  return null;
}
