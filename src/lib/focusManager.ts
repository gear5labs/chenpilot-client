/**
 * Focus stack manager for nested modal / dialog workflows.
 *
 * Each time a dialog opens, the current `document.activeElement` is pushed onto
 * a stack. When the dialog closes, the last entry is popped and refocused.
 * This guarantees that focus returns to the exact triggering element even when
 * multiple dialogs are nested (e.g. a contact picker opened from a send dialog).
 *
 * Example flow:
 *   1. User clicks "Send" on page → push page element
 *   2. Send dialog opens contact picker → push element inside send dialog
 *   3. Contact picker closes → pop → refocus element inside send dialog ✓
 *   4. Send dialog closes → pop → refocus page element ✓
 */

const focusStack: HTMLElement[] = [];

/**
 * Push the currently focused element onto the stack and optionally move focus
 * to a new target element.
 */
export function pushFocus(target?: HTMLElement | null): void {
  const active = document.activeElement as HTMLElement | null;
  if (active && document.body.contains(active)) {
    focusStack.push(active);
  }
  if (target && document.body.contains(target)) {
    target.focus({ preventScroll: true });
  }
}

/**
 * Pop the last element from the stack and restore focus to it.
 * Returns true if focus was restored, false if the stack was empty.
 */
export function popFocus(): boolean {
  const target = focusStack.pop();
  if (target && document.body.contains(target)) {
    (target as HTMLElement).focus({ preventScroll: true });
    return true;
  }
  return false;
}

/**
 * Return a copy of the current focus stack depth (useful for debugging/tests).
 */
export function focusStackDepth(): number {
  return focusStack.length;
}

/**
 * Clear the entire focus stack (e.g. on sign-out or full navigation).
 */
export function clearFocusStack(): void {
  focusStack.length = 0;
}
