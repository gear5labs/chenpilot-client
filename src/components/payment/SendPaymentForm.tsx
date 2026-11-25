'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendPaymentSchema, validateSendPayment, sanitizePaymentInput } from '@/utils/validation';
import {
  ContactMemoType,
  ContactSelection,
  PaymentStatusResult,
  PaymentSubmissionResult,
  SendPaymentRequest,
  SUPPORTED_ASSETS,
  TokenType,
} from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StellarNetworkBadge } from '@/components/wallet/StellarNetworkBadge';
import { createPaymentIdempotencyKey, isPaymentOutcomeUnknown } from '@/utils/paymentOutcome';
import ContactPicker from './ContactPicker';
import {
  Send,
  User,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock3,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import { getStoredLanguage, t, translateValidation, type Language } from '@/lib/i18n/i18n';
import { LiveAnnouncer, SILENT_TOAST, type Announcement } from '@/components/ui/LiveAnnouncer';

/** Normalizes a Stellar-style address for case-insensitive UX comparison only. */
function normalizeAddress(address?: string | null): string {
  return address ? address.trim().toUpperCase() : '';
}

/** Max lengths mirror the Stellar memo limits enforced by the schema. */
const MEMO_MAX_LENGTH: Record<Exclude<ContactMemoType, 'none'>, number> = {
  text: 28,
  id: 20,
  hash: 64,
};

interface SendPaymentFormProps {
  /**
   * Submit the reviewed payment. Receives a fresh idempotency key so a retry of
   * the same logical payment cannot create a duplicate on-chain transfer.
   * May resolve to a submission result, or void for legacy callers.
   */
  onSubmit: (
    data: SendPaymentRequest,
    idempotencyKey: string,
  ) => Promise<PaymentSubmissionResult | void>;
  /** Poll the backend for the outcome of a payment whose result was uncertain. */
  onCheckStatus?: (idempotencyKey: string) => Promise<PaymentStatusResult>;
  contacts: any[];
  isLoading?: boolean;
  /** When false the form keeps the draft but blocks submission. Defaults to online. */
  isOnline?: boolean;
  defaultTokenType?: TokenType;
  /**
   * The signed-in wallet address. When provided, the form warns the user if the
   * recipient matches it. Advisory only — the backend is the authoritative check.
   */
  senderAddress?: string;
  /** Optional contact id to preselect once contacts have loaded. */
  initialContactId?: string;
}

type PaymentPhase = 'editing' | 'review' | 'pending' | 'completed' | 'failed' | 'uncertain';

export const SendPaymentForm: React.FC<SendPaymentFormProps> = ({
  onSubmit,
  onCheckStatus,
  contacts,
  isLoading = false,
  isOnline = true,
  defaultTokenType = 'XLM',
  senderAddress,
  initialContactId,
}) => {
  const language = getStoredLanguage() as Language;
  const tt = (path: string) => t(language, path);
  const tv = (message: string | undefined) => translateValidation(language, message);

  const [selectedContact, setSelectedContact] = useState<ContactSelection | null>(null);
  const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelfTransfer, setIsSelfTransfer] = useState(false);
  const [selfTransferAcknowledged, setSelfTransferAcknowledged] = useState(false);
  // Screen-reader status for submission (#307)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  // Review / safe-status flow
  const [reviewPayment, setReviewPayment] = useState<SendPaymentRequest | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<PaymentPhase>('editing');
  const [paymentResult, setPaymentResult] = useState<PaymentSubmissionResult | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [statusCheckMessage, setStatusCheckMessage] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  // Offline draft retention
  const [retryAvailable, setRetryAvailable] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SendPaymentRequest>({
    resolver: zodResolver(sendPaymentSchema),
    defaultValues: {
      tokenType: defaultTokenType,
      memoType: 'none',
    },
  });

  const watchedToken = watch('tokenType');
  const watchedMemoType = watch('memoType');
  const watchedMemo = watch('memo');
  const watchedRecipient = watch('recipientAddress');
  const watchedAmount = watch('amount');
  const hasPaymentDraft = Boolean(watchedRecipient?.trim() || watchedAmount);

  // Preselect contact when initialContactId is provided and contacts are loaded
  useEffect(() => {
    if (!initialContactId || contacts.length === 0 || selectedContact) return;
    const match = contacts.find((c) => c.id === initialContactId);
    if (match) {
      const selection: ContactSelection = {
        id: match.id,
        name: match.name,
        address: match.address,
        tokenType: match.tokenType,
        avatar: match.avatar,
        isFavorite: match.isFavorite,
        lastUsed: match.lastUsed,
        defaultMemo: match.defaultMemo,
        defaultMemoType: match.defaultMemoType,
      };
      applyContactSelection(selection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContactId, contacts, selectedContact]);

  // Once a draft exists and connectivity drops, offer an explicit retry when it returns
  useEffect(() => {
    if (!isOnline && hasPaymentDraft) {
      setRetryAvailable(true);
    }
  }, [hasPaymentDraft, isOnline]);

  // Accessible summary of the selected asset and memo, announced on change (#a11y)
  const memoSummary =
    watchedMemoType === 'none' || !watchedMemoType
      ? 'No memo'
      : watchedMemo?.trim()
        ? `${watchedMemoType} memo: ${watchedMemo}`
        : `${watchedMemoType} memo`;
  const selectionSummary = `Payment asset: ${watchedToken ?? defaultTokenType}. ${memoSummary}.`;

  // Check self-transfer on every address field change
  const handleRecipientChange = (value: string) => {
    if (senderAddress && value.trim().length > 0) {
      const isSelf = normalizeAddress(value) === normalizeAddress(senderAddress);
      setIsSelfTransfer(isSelf);
      if (!isSelf) setSelfTransferAcknowledged(false);
    } else {
      setIsSelfTransfer(false);
      setSelfTransferAcknowledged(false);
    }
  };

  const applyContactSelection = (contact: ContactSelection) => {
    setSelectedContact(contact);
    setValue('recipientAddress', contact.address);
    setValue('tokenType', contact.tokenType);
    handleRecipientChange(contact.address);

    // Prefill memo preset only when the contact carries one.
    // The user remains free to edit or clear these values before submitting.
    if (contact.defaultMemo && contact.defaultMemoType && contact.defaultMemoType !== 'none') {
      setValue('memo', contact.defaultMemo);
      setValue('memoType', contact.defaultMemoType);
    } else {
      setValue('memo', '');
      setValue('memoType', 'none');
    }
  };

  const handleContactSelect = (contact: ContactSelection) => {
    applyContactSelection(contact);
    toast.success(`Selected ${contact.name}`);
  };

  const handleClearContact = () => {
    setSelectedContact(null);
    setValue('recipientAddress', '');
    setIsSelfTransfer(false);
    setSelfTransferAcknowledged(false);
  };

  const handleFormSubmit = (data: SendPaymentRequest) => {
    // Guard: warn user about self-transfer but allow them to proceed after
    // acknowledging.  This is a UX safeguard only — the backend is the
    // authoritative check.
    if (isSelfTransfer && !selfTransferAcknowledged) {
      toast.error('Please read and acknowledge the self-transfer warning before sending.', SILENT_TOAST);
      return;
    }

    const sanitizedData = sanitizePaymentInput(data) as SendPaymentRequest;
    if (selectedContact) {
      sanitizedData.recipientContactId = selectedContact.id;
    }

    // Validate again (defensive programming)
    const validation = validateSendPayment(sanitizedData);
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error, SILENT_TOAST));
      setAnnouncement({ text: `Payment not sent: ${validation.errors[0] ?? 'invalid details'}`, tone: 'assertive' });
      return;
    }

    setReviewPayment(sanitizedData);
    setIdempotencyKey(createPaymentIdempotencyKey());
    setPaymentError(null);
    setPaymentPhase('review');
  };

  const closeReview = () => {
    if (isSubmitting) return;
    setPaymentPhase('editing');
    setReviewPayment(null);
    setIdempotencyKey(null);
  };

  const confirmPayment = async () => {
    if (!reviewPayment || !idempotencyKey) return;

    setIsSubmitting(true);
    setPaymentError(null);
    setAnnouncement({ text: 'Sending payment…', tone: 'polite' });
    try {
      const result = (await onSubmit(reviewPayment, idempotencyKey)) as
        | PaymentSubmissionResult
        | undefined;
      const status = result?.status;
      setPaymentResult(result ?? null);
      setPaymentPhase(
        status === 'confirmed' ? 'completed' : status === 'failed' ? 'failed' : 'pending',
      );
      setAnnouncement({
        text: status === 'confirmed' ? 'Payment confirmed.' : status === 'failed' ? 'Payment failed.' : 'Payment submitted.',
        tone: status === 'failed' ? 'assertive' : 'polite',
      });
    } catch (error: unknown) {
      console.error('Payment submission error:', error);
      if (isPaymentOutcomeUnknown(error)) {
        setPaymentError(error instanceof Error ? error.message : 'Payment outcome is unknown.');
        setPaymentPhase('uncertain');
        setAnnouncement({ text: 'Payment status unknown. Check the payment status before retrying.', tone: 'assertive' });
      } else {
        const message = error instanceof Error ? error.message : 'Failed to submit payment.';
        setPaymentError(message);
        setReviewPayment(null);
        setIdempotencyKey(null);
        setPaymentPhase('editing');
        toast.error(message, SILENT_TOAST);
        setAnnouncement({ text: `Payment failed: ${message}`, tone: 'assertive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!idempotencyKey || !onCheckStatus) return;

    setIsCheckingStatus(true);
    setStatusCheckMessage(null);
    try {
      const result = await onCheckStatus(idempotencyKey);
      if (result.status === 'confirmed') {
        setPaymentResult(result);
        setPaymentPhase('completed');
      } else if (result.status === 'failed') {
        setPaymentResult(result);
        setPaymentPhase('failed');
      } else if (result.status === 'pending' || result.status === 'submitted') {
        setPaymentResult(result);
        setPaymentPhase('pending');
      } else {
        setStatusCheckMessage('No final status is available yet. Keep this screen open and check again; do not resend the payment.');
      }
    } catch {
      setStatusCheckMessage('Status could not be retrieved. The payment may still have been submitted; check again before taking further action.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const startFreshPayment = () => {
    reset({ tokenType: defaultTokenType, memoType: 'none' });
    setSelectedContact(null);
    setReviewPayment(null);
    setIdempotencyKey(null);
    setPaymentResult(null);
    setPaymentError(null);
    setStatusCheckMessage(null);
    setRetryAvailable(false);
    setIsSelfTransfer(false);
    setSelfTransferAcknowledged(false);
    setPaymentPhase('editing');
  };

  if (paymentPhase === 'pending' || paymentPhase === 'completed' || paymentPhase === 'failed' || paymentPhase === 'uncertain') {
    const transactionReference = paymentResult?.transactionHash ?? paymentResult?.transactionId;

    return (
      <Card className="space-y-5 border border-gray-700 bg-gray-950 p-6 text-white">
        <div className="flex items-start gap-3">
          {paymentPhase === 'completed' ? (
            <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-400" aria-hidden="true" />
          ) : paymentPhase === 'pending' ? (
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" aria-hidden="true" />
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {paymentPhase === 'completed' ? 'Payment confirmed' : paymentPhase === 'failed' ? 'Payment failed' : paymentPhase === 'pending' ? 'Payment submitted' : 'Payment status unknown'}
            </h2>
            <p className="mt-1 text-sm text-gray-300">
              {paymentPhase === 'completed'
                ? 'The server confirmed this payment.'
                : paymentPhase === 'failed'
                  ? paymentResult?.message ?? 'The server confirmed that this payment failed.'
                  : paymentPhase === 'pending'
                    ? 'The server accepted this payment. Check its status for confirmation.'
                    : paymentError ?? 'We could not determine whether the payment was submitted.'}
            </p>
          </div>
        </div>

        {reviewPayment && (
          <dl className="grid gap-3 border-y border-gray-800 py-4 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-400">Recipient</dt><dd className="break-all font-mono text-gray-100">{reviewPayment.recipientAddress}</dd></div>
            <div><dt className="text-gray-400">Amount</dt><dd className="text-gray-100">{reviewPayment.amount} {reviewPayment.tokenType}</dd></div>
          </dl>
        )}

        {transactionReference && (
          <div className="space-y-1 text-sm">
            <p className="text-gray-400">Transaction reference</p>
            <p className="break-all font-mono text-gray-100">{transactionReference}</p>
          </div>
        )}

        {(paymentPhase === 'pending' || paymentPhase === 'uncertain') && onCheckStatus && (
          <div className="space-y-3">
            {statusCheckMessage && <p role="status" className="text-sm text-amber-200">{statusCheckMessage}</p>}
            <Button type="button" onClick={checkPaymentStatus} disabled={isCheckingStatus}>
              {isCheckingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />}
              Check payment status
            </Button>
          </div>
        )}

        {(paymentPhase === 'completed' || paymentPhase === 'failed') && (
          <Button type="button" onClick={startFreshPayment}>Start a new payment</Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <LiveAnnouncer announcement={announcement} />
      {/* Contact Selection */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Recipient</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsContactPickerOpen(true)}
            className="text-blue-400 hover:text-blue-300"
          >
            <User className="h-4 w-4 mr-1" aria-hidden="true" />
            {tt('payment.selectContact')}
          </Button>
        </div>

        {selectedContact ? (
          <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm"
              >
                {selectedContact.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white">{selectedContact.name}</p>
                <p className="text-xs text-gray-400">{selectedContact.tokenType}</p>
                {selectedContact.defaultMemo && selectedContact.defaultMemoType && selectedContact.defaultMemoType !== 'none' && (
                  <p className="text-xs text-blue-300 mt-0.5">
                    Memo preset applied — you can edit it below
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearContact}
              className="text-gray-400 hover:text-white"
              aria-label={`Remove ${selectedContact.name} as recipient`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-sm">
            {tt('payment.selectContactHint')}
          </div>
        )}
      </Card>

      {/* Payment Form */}
      <Card className="p-6">
        {!isOnline && (
          <p role="status" className="mb-4 text-sm text-amber-300">
            You are offline. Payments are not queued. Your entered details will remain here until you can retry.
          </p>
        )}
        {isOnline && retryAvailable && hasPaymentDraft && (
          <div role="status" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-blue-700 bg-blue-900/30 p-3 text-sm text-blue-100">
            <span>Connection restored. Your payment draft is ready.</span>
            <Button
              type="button"
              size="sm"
              onClick={() => { void handleSubmit(handleFormSubmit)(); }}
              disabled={isSubmitting || isLoading}
            >
              Retry payment
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
          {/* Live summary of the selected asset and memo for screen readers */}
          <p aria-live="polite" className="sr-only" data-testid="payment-selection-summary">
            {selectionSummary}
          </p>

          {/* Recipient Address */}
          <div>
            <label htmlFor="recipient-address" className="block text-sm font-medium text-gray-300 mb-2">
              {tt('payment.recipientAddress')}
            </label>
            <Input
              id="recipient-address"
              {...register('recipientAddress', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleRecipientChange(e.target.value),
              })}
              placeholder="GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
              className={cn(
                'font-mono text-sm',
                selectedContact && 'bg-blue-500/5 border-blue-500/30',
                isSelfTransfer && 'border-yellow-500/70'
              )}
              disabled={!!selectedContact}
              aria-invalid={!!errors.recipientAddress || isSelfTransfer}
              aria-describedby={
                [
                  errors.recipientAddress ? 'recipient-address-error' : null,
                  isSelfTransfer ? 'self-transfer-warning' : null,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
            />
            {errors.recipientAddress && (
              <p
                id="recipient-address-error"
                role="alert"
                className="mt-1 text-xs text-red-400"
              >
                {tv(errors.recipientAddress.message)}
              </p>
            )}

            {/* Self-transfer warning — advisory, not a hard block */}
            {isSelfTransfer && (
              <div
                id="self-transfer-warning"
                role="alert"
                className="mt-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/40 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-yellow-300">
                    <strong>Sending to yourself?</strong> The recipient address
                    matches your own wallet. Double-check before continuing — most
                    self-transfers are accidental.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selfTransferAcknowledged}
                    onChange={(e) => setSelfTransferAcknowledged(e.target.checked)}
                    className="rounded border-yellow-500 accent-yellow-400"
                  />
                  <span className="text-xs text-yellow-300">
                    {tt('payment.ownAddressConfirm')}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="send-amount" className="block text-sm font-medium text-gray-300 mb-2">
              {tt('payment.amount')}
            </label>
            <div className="flex space-x-2">
              <Input
                id="send-amount"
                {...register('amount')}
                placeholder="0.00"
                type="number"
                step="0.0000001"
                min="0"
                className="flex-1"
              />
              <div>
                <label htmlFor="token-type-select" className="block text-xs font-medium text-gray-400 mb-1">
                  {tt('payment.tokenType')}
                </label>
                <select
                  id="token-type-select"
                  {...register('tokenType')}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SUPPORTED_ASSETS.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {errors.amount && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {tv(errors.amount.message)}
              </p>
            )}
            {errors.tokenType && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {tv(errors.tokenType.message)}
              </p>
            )}
          </div>

          {/* Memo */}
          <div>
            <label htmlFor="memo-type-select" className="block text-sm font-medium text-gray-300 mb-2">
              {tt('payment.memoOptional')}
            </label>
            <div className="space-y-2">
              <select
                id="memo-type-select"
                {...register('memoType')}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={tt('payment.memoType')}
              >
                <option value="none">No Memo</option>
                <option value="text">Text Memo</option>
                <option value="id">ID Memo</option>
                <option value="hash">Hash Memo</option>
              </select>

              {watchedMemoType !== 'none' && watchedMemoType && (
                <Input
                  id="memo-value-input"
                  aria-label={tt('payment.memoValue')}
                  {...register('memo')}
                  placeholder={
                    watchedMemoType === 'text'
                      ? 'Enter memo text (max 28 characters)'
                      : watchedMemoType === 'id'
                        ? 'Enter numeric ID'
                        : 'Enter 64-character hex hash'
                  }
                  className={cn(
                    'font-mono text-sm',
                    watchedMemoType === 'hash' && 'uppercase'
                  )}
                  maxLength={MEMO_MAX_LENGTH[watchedMemoType as Exclude<ContactMemoType, 'none'>] ?? 28}
                />
              )}
            </div>
            {errors.memo && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {tv(errors.memo.message)}
              </p>
            )}
            {errors.memoType && (
              <p role="alert" className="mt-1 text-xs text-red-400">
                {tv(errors.memoType.message)}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              isLoading ||
              !isOnline ||
              (isSelfTransfer && !selfTransferAcknowledged)
            }
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                {tt('payment.sending')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                {isOnline ? tt('payment.sendPayment') : 'Unavailable offline'}
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Contact Picker Modal */}
      <ContactPicker
        contacts={contacts}
        onSelect={handleContactSelect}
        onClose={() => setIsContactPickerOpen(false)}
        isOpen={isContactPickerOpen}
        tokenType={watchedToken}
      />

      {/* Review payment — explicit confirmation before anything is sent */}
      <Modal
        isOpen={paymentPhase === 'review' && !!reviewPayment}
        onClose={closeReview}
        title="Review payment"
        className="border border-gray-700 bg-gray-950 text-white"
        titleClassName="text-white"
      >
        {reviewPayment && (
          <div className="space-y-5">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-gray-400">Recipient</dt>
                <dd className="mt-1 break-all font-mono text-gray-100">{reviewPayment.recipientAddress}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-400">Amount</dt>
                <dd className="text-right font-semibold text-white">{reviewPayment.amount} {reviewPayment.tokenType}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Memo</dt>
                <dd className="mt-1 break-all text-gray-100">
                  {reviewPayment.memo ? `${reviewPayment.memo} (${reviewPayment.memoType ?? 'text'})` : 'No memo'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-400">Network</dt>
                <dd><StellarNetworkBadge /></dd>
              </div>
            </dl>

            {paymentError && <p role="alert" className="text-sm text-red-300">{paymentError}</p>}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeReview} disabled={isSubmitting}>
                Return to edit
              </Button>
              <Button type="button" onClick={confirmPayment} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />}
                Confirm and send
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SendPaymentForm;
