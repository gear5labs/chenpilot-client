const INTERNAL_ORIGIN = 'https://chenpilot.internal';

export type AuthRedirectReason = 'session-expired';

export function getSafeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null;
  }

  try {
    const url = new URL(value, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.pathname === '/' || url.pathname.startsWith('/auth/')) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildLoginUrl(
  returnTo?: string | null,
  reason?: AuthRedirectReason,
): string {
  const query = new URLSearchParams();
  const safeReturnPath = getSafeReturnPath(returnTo);

  if (safeReturnPath) query.set('returnTo', safeReturnPath);
  if (reason) query.set('reason', reason);

  const search = query.toString();
  return search ? `/auth/login?${search}` : '/auth/login';
}

export function getPostLoginPath(search: string): string {
  return getSafeReturnPath(new URLSearchParams(search).get('returnTo')) ?? '/chat';
}

export function getCurrentPath(): string | null {
  if (typeof window === 'undefined') return null;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}