"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LtrText } from "@/components/ui/LtrText";
import { horizonFetch } from "@/utils/horizonFetch";
import { formatTransactionAmount, formatTransactionDate, formatTransactionFee } from "@/utils/format";
import { getTransactionExplorerUrl } from "@/components/dashboard/TransactionDetailsDrawer";

interface HorizonOperation {
  id?: string;
  type?: string;
  amount?: string;
  asset_code?: string;
  asset_type?: string;
  asset_issuer?: string;
  from?: string;
  to?: string;
  source_account?: string;
}

interface HorizonTransaction {
  hash: string;
  successful: boolean;
  created_at: string;
  ledger: number;
  fee_charged: string;
  memo?: string;
  memo_type?: string;
  source_account: string;
  operation_count?: number;
}

interface TransactionDetails {
  transaction: HorizonTransaction;
  operations: HorizonOperation[];
}

export default function TransactionDetailPage() {
  const params = useParams<{ hash: string }>();
  const router = useRouter();
  const hash = decodeURIComponent(params.hash);
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const transactionResponse = await horizonFetch(
        `/transactions/${encodeURIComponent(hash)}`,
        { signal },
      );
      if (transactionResponse.status === 404) {
        setNotFound(true);
        return;
      }
      if (!transactionResponse.ok) {
        throw new Error("Transaction service is temporarily unavailable");
      }
      const transaction = await transactionResponse.json() as HorizonTransaction;
      const operationsResponse = await horizonFetch(
        `/transactions/${encodeURIComponent(hash)}/operations?limit=200&order=asc`,
        { signal },
      );
      if (!operationsResponse.ok) {
        throw new Error("Transaction operations could not be loaded");
      }
      const operationPayload = await operationsResponse.json() as {
        _embedded?: { records?: HorizonOperation[] };
      };
      setDetails({
        transaction,
        operations: operationPayload._embedded?.records ?? [],
      });
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Unable to load transaction details");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [hash]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDetails(controller.signal);
    return () => controller.abort();
  }, [loadDetails]);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success("Transaction ID copied");
    } catch {
      toast.error("Could not copy transaction ID");
    }
  };

  if (loading) {
    return <main className="container mx-auto max-w-3xl px-4 py-10" role="status">Loading transaction details…</main>;
  }

  if (notFound) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Button type="button" variant="secondary" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <Card className="mt-6"><h1 className="text-xl font-semibold">Transaction not found</h1><p className="mt-2 text-sm text-gray-500">No transaction was found for this identifier.</p></Card>
      </main>
    );
  }

  if (error || !details) {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Button type="button" variant="secondary" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
        <Card className="mt-6"><div role="alert"><h1 className="text-xl font-semibold">Unable to load transaction</h1><p className="mt-2 text-sm text-gray-500">{error ?? "Transaction details are unavailable."}</p></div><Button type="button" className="mt-4" onClick={() => void loadDetails()}><RefreshCw className="mr-2 h-4 w-4" />Try again</Button></Card>
      </main>
    );
  }

  const tx = details.transaction;
  const firstPayment = details.operations.find((operation) => operation.amount);
  const asset = firstPayment?.asset_code ?? (firstPayment?.asset_type === "native" ? "XLM" : undefined);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 text-gray-900 dark:text-white">
      <Button type="button" variant="secondary" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back to transactions</Button>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm text-gray-500">Transaction</p><h1 className="mt-1 text-2xl font-bold">Transaction details</h1></div>
        <span className={tx.successful ? "rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-600" : "rounded-full bg-red-500/10 px-3 py-1 text-sm text-red-600"}>{tx.successful ? "Successful" : "Failed"}</span>
      </div>
      <Card className="mt-6 space-y-6">
        <section><p className="text-sm text-gray-500">Transaction ID</p><div className="mt-2 flex items-start gap-2"><LtrText className="min-w-0 flex-1 break-all font-mono text-sm">{tx.hash}</LtrText><Button type="button" variant="secondary" onClick={copyHash} aria-label="Copy full transaction identifier"><Copy className="h-4 w-4" /></Button></div></section>
        <dl className="grid gap-5 sm:grid-cols-2">
          <div><dt className="text-sm text-gray-500">Amount</dt><dd className="mt-1 font-semibold">{firstPayment?.amount ? <LtrText>{formatTransactionAmount(firstPayment.amount, { asset: asset ?? "XLM" })}</LtrText> : "Not available"}</dd></div>
          <div><dt className="text-sm text-gray-500">Asset</dt><dd className="mt-1 font-semibold">{asset ?? "Not available"}</dd></div>
          <div><dt className="text-sm text-gray-500">Date</dt><dd className="mt-1"><LtrText>{formatTransactionDate(tx.created_at)}</LtrText></dd></div>
          <div><dt className="text-sm text-gray-500">Fee</dt><dd className="mt-1"><LtrText>{formatTransactionFee(tx.fee_charged, { asset: "XLM" })}</LtrText></dd></div>
          <div><dt className="text-sm text-gray-500">Ledger</dt><dd className="mt-1"><LtrText>#{tx.ledger}</LtrText></dd></div>
          <div><dt className="text-sm text-gray-500">Memo</dt><dd className="mt-1 break-words">{tx.memo || "No memo"}</dd></div>
        </dl>
        <section><h2 className="font-semibold">Transaction identifier</h2><p className="mt-2 break-all font-mono text-xs text-gray-500">{tx.hash}</p></section>
        <a href={getTransactionExplorerUrl(tx.hash)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-500 hover:underline">View on Stellar explorer <ExternalLink className="h-4 w-4" /></a>
      </Card>
      <section className="mt-6"><h2 className="font-semibold">Operations</h2>{details.operations.length ? <ol className="mt-3 space-y-3">{details.operations.map((operation, index) => <li key={operation.id ?? index}><Card><p className="font-medium">{(operation.type ?? "Operation").replace(/_/g, " ")}</p>{operation.amount && <p className="mt-1 text-sm"><LtrText>{formatTransactionAmount(operation.amount, { asset: operation.asset_code ?? "XLM" })}</LtrText></p>}{(operation.from || operation.to) && <p className="mt-2 break-all text-xs text-gray-500">{operation.from ? `From: ${operation.from}` : ""}{operation.from && operation.to ? " · " : ""}{operation.to ? `To: ${operation.to}` : ""}</p>}</Card></li>)}</ol> : <p className="mt-2 text-sm text-gray-500">No operation details are available.</p>}</section>
    </main>
  );
}
