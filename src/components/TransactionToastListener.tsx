'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '@/hooks/useSocket';

interface TransactionEvent {
  hash?: string;
  amount?: string;
  asset?: string;
  message?: string;
}

export function TransactionToastListener() {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTransaction = (event: TransactionEvent) => {
      const label = event.message
        ?? (event.amount && event.asset
          ? `Transaction complete: ${event.amount} ${event.asset}`
          : 'Transaction completed successfully');
      toast.success(label, { duration: 5000 });
    };

    socket.on('transaction:completed', handleTransaction);
    socket.on('transaction:success', handleTransaction);

    return () => {
      socket.off('transaction:completed', handleTransaction);
      socket.off('transaction:success', handleTransaction);
    };
  }, [socket]);

  return null;
}
