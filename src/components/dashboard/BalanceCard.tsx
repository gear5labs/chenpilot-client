'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WalletBalance } from '@/types';
import { formatRelativeTime, formatTokenAmount } from '@/utils/format';

interface BalanceCardProps {
  balance: WalletBalance | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: string | null;
  error: string | null;
  onRefresh: () => void;
}

export function BalanceCard({ balance, isLoading, isRefreshing, lastUpdated, error, onRefresh }: BalanceCardProps) {
  const [now, setNow] = useState(Date.now());
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const refresh = () => {
    if (isRefreshing || cooldown > 0) return;
    setCooldown(3);
    onRefresh();
  };

  return (
    <Card className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Account balance</h2>
          {isLoading && !balance ? (
            <div aria-label="Loading balance" className="mt-3 h-8 w-40 animate-pulse rounded bg-gray-700" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-white">{balance ? `${formatTokenAmount(balance.balance, 4)} XLM` : 'Balance unavailable'}</p>
          )}
          {lastUpdated && <p className="mt-1 text-xs text-gray-400">Updated {formatRelativeTime(lastUpdated, new Date(now))}</p>}
          {error && balance && <p role="status" className="mt-2 text-sm text-amber-300">Refresh failed; showing the last known balance. {error}</p>}
          {error && !balance && !isLoading && <p role="status" className="mt-2 text-sm text-red-300">{error}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={isRefreshing || cooldown > 0} loading={isRefreshing} aria-label="Refresh balance">
          {!isRefreshing && <RefreshCw className="mr-2 h-4 w-4" />}
          {cooldown > 0 && !isRefreshing ? `Refresh in ${cooldown}s` : isRefreshing ? 'Refreshing' : 'Refresh'}
        </Button>
      </div>
    </Card>
  );
}
