'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  isAccountReady: boolean;
}

export function buildPaymentRequest(address: string, amount: string, memo: string): string {
  const params = new URLSearchParams({ destination: address });
  if (amount.trim()) params.set('amount', amount.trim());
  if (memo.trim()) {
    params.set('memo', memo.trim());
    params.set('memo_type', 'MEMO_TEXT');
  }
  return `web+stellar:pay?${params.toString()}`;
}

export function ReceiveModal({ isOpen, onClose, address, isAccountReady }: ReceiveModalProps) {
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const request = useMemo(() => buildPaymentRequest(address, amount, memo), [address, amount, memo]);

  useEffect(() => {
    let active = true;
    if (!isOpen || !address) {
      setQrCode('');
      return () => { active = false; };
    }
    setIsGenerating(true);
    QRCode.toDataURL(request, { errorCorrectionLevel: 'M', margin: 2, width: 240 })
      .then((dataUrl) => { if (active) setQrCode(dataUrl); })
      .catch(() => { if (active) setQrCode(''); })
      .finally(() => { if (active) setIsGenerating(false); });
    return () => { active = false; };
  }, [address, isOpen, request]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied');
    } catch {
      toast.error('Could not access the clipboard. Copy the address manually.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive payment" size="md">
      <div className="space-y-4">
        {!isAccountReady && <p role="status" className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">This account is not deployed or funded yet. Incoming payments may not be available.</p>}
        <div className="flex justify-center rounded-lg bg-white p-3 min-h-64 items-center">
          {isGenerating ? <Loader2 aria-label="Generating QR code" className="h-6 w-6 animate-spin" /> : qrCode ? <img src={qrCode} alt="QR code for the Stellar payment request" width={240} height={240} /> : <p className="text-sm text-gray-500">A valid account address is required to create a QR code.</p>}
        </div>
        <div>
          <label htmlFor="receive-address" className="block text-sm font-medium mb-1">Stellar address</label>
          <div className="flex gap-2">
            <input id="receive-address" readOnly value={address} className="min-w-0 flex-1 rounded border bg-transparent px-3 py-2 font-mono text-sm" />
            <Button type="button" variant="secondary" onClick={copyAddress} disabled={!address} aria-label="Copy address"><Copy className="h-4 w-4" /></Button>
          </div>
        </div>
        <label className="block text-sm">Amount (optional)
          <input aria-label="Amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 block w-full rounded border bg-transparent px-3 py-2" placeholder="0.00" />
        </label>
        <label className="block text-sm">Memo (optional)
          <input aria-label="Memo" value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-1 block w-full rounded border bg-transparent px-3 py-2" maxLength={28} />
        </label>
        <p className="break-all text-xs text-gray-500">{request}</p>
      </div>
    </Modal>
  );
}
