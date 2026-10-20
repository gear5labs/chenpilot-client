"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import {
  getOlderTransactionHistory,
  getTransactionHistory,
  refreshTransactionHistory,
} from "@/store/slices/accountSlice";
import { singleFlight } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTokenAmount } from "@/utils/format";
import { RefreshCw, ReceiptText, Search, X } from "lucide-react";
import { StellarTransaction } from "@/types";

export function filterTransactionsByHash(
  items: StellarTransaction[],
  hashQuery: string,
): StellarTransaction[] {
  const normalized = hashQuery.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((tx) =>
    (tx.hash || "").toLowerCase().includes(normalized),
  );
}

/**
 * Format a timestamp for display, tolerating missing/invalid values so a bad
 * value never renders "Invalid Date" to the user.
 */
function formatLastUpdated(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return formatRelativeTime(parsed);
}

export default function TransactionsPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { status, transactions } = useSelector(
    (state: RootState) => state.account,
  );
  const [hashQuery, setHashQuery] = useState("");

  useEffect(() => {
    if (publicKey) {
      dispatch(getTransactionHistory(publicKey));
    }
  }, [dispatch, publicKey]);

  /**
   * Reload only the newest history page. The refresh is de-duplicated through
   * a single-flight guard so a double click (or any overlapping trigger) joins
   * the in-flight request instead of issuing a second one.
   */
  const handleRefresh = useCallback(() => {
    if (!publicKey) {
      return;
    }
    void singleFlight
      .run(`transaction-history:${publicKey}`, () =>
        dispatch(refreshTransactionHistory(publicKey)).unwrap(),
      )
      .catch(() => {
        // The failure is surfaced through `transactions.refreshError`; it must
        // not clear the history already on screen.
      });
  }, [dispatch, publicKey]);

  const handleLoadOlder = useCallback(() => {
    if (!publicKey || !transactions.nextCursor) {
      return;
    }
    void dispatch(
      getOlderTransactionHistory({
        publicKey,
        cursor: transactions.nextCursor,
      }),
    );
  }, [dispatch, publicKey, transactions.nextCursor]);

  const filteredTransactions = useMemo(
    () => filterTransactionsByHash(transactions.transactions, hashQuery),
    [transactions.transactions, hashQuery],
  );

  const getStatusColor = (successful: boolean) => {
    return successful ? "text-green-600" : "text-red-600";
  };

  const getOperationType = (type: string) => {
    switch (type) {
      case "create_account":
        return "Funding";
      case "payment":
        return "Payment";
      case "trust":
        return "Trust";
      default:
        return type.replace("_", " ").toUpperCase();
    }
  };

  // Initial load only. A background refresh keeps the existing history visible.
  if (transactions.isLoading && !hasHistory) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
        <div className="text-center" role="status">
          Loading transactions...
        </div>
      </div>
    );
  }

  if (transactions.error && !hasHistory) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Transaction History</h1>
        <Card className="border-red-200 dark:border-red-900">
          <div role="alert" className="space-y-4">
            <p className="text-red-700 dark:text-red-300">Error: {transactions.error}</p>
            {publicKey && (
              <Button
                type="button"
                onClick={() => dispatch(getTransactionHistory(publicKey))}
                className="inline-flex items-center gap-2"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        {transactions.transactions.length > 0 && (
          <div className="relative w-full sm:w-80">
            <Search
              aria-hidden="true"
              className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            />
            <input
              type="search"
              aria-label="Search by full transaction hash"
              placeholder="Search by transaction hash..."
              value={hashQuery}
              onChange={(e) => setHashQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {hashQuery && (
              <button
                type="button"
                aria-label="Clear transaction hash search"
                onClick={() => setHashQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {transactions.refreshError && (
        <Card className="mb-4 border-red-200 dark:border-red-900">
          <div role="alert" className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-red-700 dark:text-red-300">
              Could not refresh transactions: {transactions.refreshError}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
              disabled={transactions.isRefreshing}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              Retry refresh
            </Button>
          </div>
        </Card>
      )}

      {pendingConfirmations.length > 0 && (
        <Card className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Awaiting confirmation
          </h2>
          <ul className="mt-2 space-y-1">
            {pendingConfirmations.map((entry) => (
              <li
                key={entry.hash}
                role="status"
                className="flex items-center justify-between text-sm text-yellow-700 dark:text-yellow-300"
              >
                <span>{entry.label}</span>
                <span>Pending</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!hasHistory ? (
        <EmptyState
          icon={<ReceiptText aria-hidden="true" className="h-8 w-8" />}
          title="No transactions yet"
          description="Your completed transactions will appear here. Start with a wallet transfer or payment."
          action={{ label: "Go to dashboard", onClick: () => router.push("/dashboard") }}
        />
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={<Search aria-hidden="true" className="h-8 w-8" />}
          title="No matching transaction hash"
          description={`No transaction matched "${hashQuery.trim()}". Check the full hash or reset your search.`}
          action={{ label: "Reset search", onClick: () => setHashQuery("") }}
        />
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold" title={tx.hash}>
                    Transaction {tx.hash.slice(0, 8)}...
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatTransactionDate(tx.created_at, { language })}
                  </p>
                </div>
                <div
                  className={`font-semibold ${getStatusColor(tx.successful)}`}
                >
                  {tx.successful ? "Confirmed" : "Failed"}
                </div>
              </div>

              <div className="space-y-2">
                {tx.operations.map((op) => (
                  <div
                    key={op.id}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded"
                  >
                    <div>
                      <span className="font-medium">
                        {getOperationType(op.type)}
                      </span>
                      {op.amount && (
                        <span className="ml-2 text-sm">
                          {formatTransactionAmount(op.amount, { language, asset: op.asset || "XLM" })}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {op.to && `To: ${op.to.slice(0, 8)}...`}
                      {op.from && `From: ${op.from.slice(0, 8)}...`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Fee: {formatTransactionFee(tx.fee_charged, { language, asset: "XLM" })} | Ledger:{" "}
                {tx.ledger}
              </div>
            </Card>
          ))}

          {transactions.loadMoreError && (
            <div role="alert" className="text-sm text-red-700 dark:text-red-300">
              Could not load older transactions: {transactions.loadMoreError}
            </div>
          )}

          {transactions.nextCursor && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoadOlder}
                loading={transactions.isLoadingMore}
                disabled={transactions.isLoadingMore}
              >
                {transactions.isLoadingMore ? "Loading..." : "Load older transactions"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
