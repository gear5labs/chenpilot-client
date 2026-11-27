import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TransactionDetailPage from "./page";

const { back } = vi.hoisted(() => ({ back: vi.fn() }));
const { horizonFetch } = vi.hoisted(() => ({ horizonFetch: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back }), useParams: () => ({ hash: "abc123" }) }));
vi.mock("@/utils/horizonFetch", () => ({ horizonFetch }));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const transaction = {
  hash: "abc123",
  successful: true,
  created_at: "2026-10-20T12:00:00Z",
  ledger: 123,
  fee_charged: "100",
  memo: "Invoice 42",
  memo_type: "text",
  source_account: "Gsource",
};

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

describe("TransactionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    horizonFetch.mockResolvedValueOnce(response(transaction)).mockResolvedValueOnce(response({ _embedded: { records: [{ id: "op-1", type: "payment", amount: "25", asset_code: "USDC", asset_type: "credit_alphanum4" }] } }));
  });

  it("renders transaction details and optional memo", async () => {
    render(<TransactionDetailPage />);
    expect(await screen.findByText("Invoice 42")).toBeInTheDocument();
    expect(screen.getByText("25 USDC")).toBeInTheDocument();
    expect(screen.getByText("Successful")).toBeInTheDocument();
  });

  it("renders safe fallbacks when memo and amount are absent", async () => {
    horizonFetch.mockReset()
      .mockResolvedValueOnce(response({ ...transaction, memo: undefined, memo_type: undefined }))
      .mockResolvedValueOnce(response({ _embedded: { records: [{ id: "op-2", type: "account_merge" }] } }));
    render(<TransactionDetailPage />);
    expect(await screen.findByText("No memo")).toBeInTheDocument();
    expect(screen.getAllByText("Not available")).toHaveLength(2);
  });

  it("shows an explicit not-found state", async () => {
    horizonFetch.mockReset().mockResolvedValueOnce(response({}, 404));
    render(<TransactionDetailPage />);
    expect(await screen.findByText("Transaction not found")).toBeInTheDocument();
  });

  it("shows a retryable service error", async () => {
    horizonFetch.mockReset().mockResolvedValueOnce(response({}, 503));
    render(<TransactionDetailPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("temporarily unavailable");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("supports browser back navigation", async () => {
    render(<TransactionDetailPage />);
    await screen.findByText("Invoice 42");
    fireEvent.click(screen.getByRole("button", { name: "Back to transactions" }));
    expect(back).toHaveBeenCalled();
  });
});
