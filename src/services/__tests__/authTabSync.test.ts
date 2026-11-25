import { describe, expect, it, vi } from 'vitest';
import { listenForAuthStorageChanges } from '../authTabSync';

describe('cross-tab auth storage changes', () => {
  it('clears local auth state when another tab removes the token', () => {
    const target = new EventTarget();
    const onSignOut = vi.fn();
    const onAuthChanged = vi.fn();
    listenForAuthStorageChanges(target, onSignOut, onAuthChanged);

    target.dispatchEvent(new StorageEvent('storage', { key: 'auth_token', newValue: null }));

    expect(onSignOut).toHaveBeenCalledOnce();
    expect(onAuthChanged).not.toHaveBeenCalled();
  });

  it('reinitializes auth when another tab changes stored credentials', () => {
    const target = new EventTarget();
    const onSignOut = vi.fn();
    const onAuthChanged = vi.fn();
    listenForAuthStorageChanges(target, onSignOut, onAuthChanged);

    target.dispatchEvent(new StorageEvent('storage', { key: 'auth_token', newValue: 'new-token' }));

    expect(onAuthChanged).toHaveBeenCalledOnce();
    expect(onSignOut).not.toHaveBeenCalled();
  });
});