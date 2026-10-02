'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchProfile, resendVerification } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/Button';

const COOLDOWN_MS = 60_000;
const dismissedForSession = new Set<string>();

export function EmailVerificationBanner() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [dismissed, setDismissed] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const userKey = user?.id ? `email-verification-dismissed:${user.id}` : '';
  const cooldownKey = user?.id ? `email-verification-resend-until:${user.id}` : '';

  useEffect(() => {
    if (!userKey) return;
    setDismissed(dismissedForSession.has(userKey));
  }, [userKey]);

  useEffect(() => {
    if (!user || user.isEmailVerified) return;
    const refresh = () => { void dispatch(fetchProfile()); };
    const interval = setInterval(refresh, 10_000);
    return () => clearInterval(interval);
  }, [dispatch, user?.id, user?.isEmailVerified]);

  useEffect(() => {
    if (!cooldownKey) return;
    const update = () => {
      const until = Number(sessionStorage.getItem(cooldownKey) || 0);
      setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 1_000);
    return () => clearInterval(interval);
  }, [cooldownKey]);

  if (!user || user.isEmailVerified || dismissed) return null;

  const handleResend = async () => {
    if (remaining > 0) return;
    try {
      await dispatch(resendVerification(user.email)).unwrap();
      sessionStorage.setItem(cooldownKey, String(Date.now() + COOLDOWN_MS));
      setRemaining(60);
      toast.success('Verification email sent');
    } catch (error) {
      toast.error(typeof error === 'string' ? error : 'Could not resend verification email');
    }
  };

  const dismiss = () => {
    dismissedForSession.add(userKey);
    setDismissed(true);
  };

  return (
    <div role="status" className="flex items-center justify-between gap-4 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
      <p>Please verify your email address to unlock all account actions.</p>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="secondary" onClick={handleResend} disabled={remaining > 0}>
          {remaining > 0 ? `Resend in ${remaining}s` : 'Resend email'}
        </Button>
        <button type="button" onClick={dismiss} aria-label="Dismiss verification notice for this session"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
